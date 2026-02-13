from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import bcrypt
import jwt
from datetime import datetime, timedelta

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/ecolearn")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

JWT_SECRET = "your_secret_key_here"  # Change to env var in production
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = timedelta(hours=1)

CARBON_KG_PER_TREE = 20.0

app = FastAPI(title="EcoLearn AI Backend", description="API for ecological learning platform")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter API key from environment (optional: only needed for AI learning path)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
print(f"OPENROUTER_API_KEY loaded: {'Yes' if OPENROUTER_API_KEY else 'No'} (length: {len(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else 0})")
client = None
if OPENROUTER_API_KEY:
    client = openai.OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1"
    )
    print("OpenRouter client initialized with API key")
else:
    print("No OpenRouter API key found, using fallback for learning path")

class LearningRequest(BaseModel):
    topic: str
    user_level: str  # e.g., beginner, intermediate
    user_id: int

class CarbonRequest(BaseModel):
    activity: str  # e.g., learning session
    duration_minutes: float
    user_id: int

class DeviceCarbonRequest(BaseModel):
    device_type: str  # phone, tablet, pc, iot
    duration_minutes: float
    user_id: int

class LogoutRequest(BaseModel):
    token: str
    device_type: str
    duration_minutes: float
    carbon_footprint_kg: float

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    message: str
    user_id: int

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)

class LearningPath(Base):
    __tablename__ = "learning_paths"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    level = Column(String)
    path_content = Column(Text)
    created_at = Column(TIMESTAMP, default="now()")

class CarbonMetric(Base):
    __tablename__ = "carbon_metrics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity = Column(String)
    duration = Column(Integer)
    footprint_kg = Column(Float)
    timestamp = Column(TIMESTAMP, default="now()")

class Plantation(Base):
    __tablename__ = "plantations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    carbon_kg = Column(Float)
    trees_planted = Column(Float)
    timestamp = Column(TIMESTAMP, default="now()")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_time = Column(TIMESTAMP, default="now()")
    logout_time = Column(TIMESTAMP, nullable=True)

class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_message = Column(Text)
    ai_response = Column(Text)
    timestamp = Column(TIMESTAMP, default="now()")

@app.get("/")
def read_root():
    return {"message": "Welcome to EcoLearn AI"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        with SessionLocal() as session:
            existing_user = session.query(User).filter(User.id == request.user_id).first()
            if not existing_user:
                raise HTTPException(status_code=400, detail="User not found. Please login again.")

        if client is None:
            ai_response = "Désolé, le service IA n'est pas disponible."
        else:
            try:
                response = client.chat.completions.create(
                    model="openai/gpt-3.5-turbo",
                    messages=[{"role": "user", "content": request.message}],
                    max_tokens=1000,
                    temperature=0.7
                )
                ai_response = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"API error: {e}")
                ai_response = "Désolé, l'IA est temporairement indisponible. Réponse fixe : Bonjour! Comment puis-je vous aider avec l'écologie et l'apprentissage ?"
        
        with SessionLocal() as session:
            new_chat = Chat(user_id=request.user_id, user_message=request.message, ai_response=ai_response)
            session.add(new_chat)
            session.commit()
        return {"ai_response": ai_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-carbon")
def calculate_carbon(request: CarbonRequest):
    device_factors = {
        "phone": 0.0015,  # ~3W * 0.5 kg/kWh
        "tablet": 0.0025,  # ~5W * 0.5 kg/kWh
        "pc": 0.025,  # ~50W * 0.5 kg/kWh
        "iot": 0.0005  # ~1W * 0.5 kg/kWh
    }
    factor = device_factors.get(request.activity.lower(), 0.0003)
    carbon_footprint = float(request.duration_minutes) * factor
    with SessionLocal() as session:
        existing_user = session.query(User).filter(User.id == request.user_id).first()
        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found. Please login again.")
        new_metric = CarbonMetric(user_id=request.user_id, activity=request.activity, duration=int(request.duration_minutes), footprint_kg=carbon_footprint)
        session.add(new_metric)
        session.commit()
    return {"carbon_footprint_kg": carbon_footprint}

@app.post("/estimate-carbon")
def estimate_carbon(request: DeviceCarbonRequest):
    device_factors = {
        "phone": 0.0015,  # ~3W * 0.5 kg/kWh
        "tablet": 0.0025,  # ~5W * 0.5 kg/kWh
        "pc": 0.025,  # ~50W * 0.5 kg/kWh
        "iot": 0.0005  # ~1W * 0.5 kg/kWh
    }
    factor = device_factors.get(request.device_type.lower())
    if factor is None:
        raise HTTPException(status_code=400, detail="Invalid device_type")
    carbon_footprint = float(request.duration_minutes) * factor
    return {"carbon_footprint_kg": carbon_footprint}

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + JWT_EXPIRATION
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

@app.post("/register")
def register(request: RegisterRequest):
    with SessionLocal() as session:
        existing = session.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(request.password)
        new_user = User(name=request.name, email=request.email, password=hashed)
        session.add(new_user)
        session.commit()
        return {"message": "User registered successfully"}

@app.post("/login")
def login(request: LoginRequest):
    with SessionLocal() as session:
        user = session.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # Create session
        new_session = Session(user_id=user.id)
        session.add(new_session)
        session.commit()
        token = create_jwt_token({"user_id": user.id, "session_id": new_session.id})
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}

@app.post("/logout")
def logout(request: LogoutRequest):
    try:
        payload = jwt.decode(request.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["user_id"]
        session_id = payload["session_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    with SessionLocal() as session:
        existing_user = session.query(User).filter(User.id == user_id).first()
        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found. Please login again.")
        sess = session.query(Session).filter(Session.id == session_id, Session.user_id == user_id, Session.logout_time == None).first()
        if sess:
            logout_time = datetime.utcnow()
            sess.logout_time = logout_time
            session.commit()

            new_metric = CarbonMetric(
                user_id=user_id,
                activity=f"session_{request.device_type}",
                duration=int(request.duration_minutes),
                footprint_kg=float(request.carbon_footprint_kg),
            )
            session.add(new_metric)
            session.commit()

            trees_planted = float(request.carbon_footprint_kg) / CARBON_KG_PER_TREE
            plantation = Plantation(
                user_id=user_id,
                carbon_kg=float(request.carbon_footprint_kg),
                trees_planted=trees_planted,
            )
            session.add(plantation)
            session.commit()
        return {"message": "Logged out successfully"}

@app.get("/get-carbon-metrics")
def get_carbon_metrics(user_id: int):
    with SessionLocal() as session:
        existing_user = session.query(User).filter(User.id == user_id).first()
        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found. Please login again.")
        metrics = session.query(CarbonMetric).filter(CarbonMetric.user_id == user_id).order_by(CarbonMetric.timestamp.desc()).all()
        return [{"activity": m.activity, "duration": m.duration, "footprint_kg": m.footprint_kg, "timestamp": m.timestamp} for m in metrics]

@app.delete("/clear-chat-history")
def clear_chat_history(user_id: int):
    with SessionLocal() as session:
        existing_user = session.query(User).filter(User.id == user_id).first()
        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found. Please login again.")
        session.query(Chat).filter(Chat.user_id == user_id).delete()
        session.commit()
    return {"message": "Chat history cleared"}

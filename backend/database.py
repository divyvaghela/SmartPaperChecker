import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "smart_paper_checker")

try:
    # 1.5 સેકન્ડથી વધુ રાહ ન જુએ જો મોંગો બંધ હોય તો
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=1500)
    database = client[DB_NAME]
    submissions_collection = database.get_collection("submissions")
    institutes_collection = database.get_collection("institutes")
    users_collection = database.get_collection("users")
    exams_collection = database.get_collection("exams")
except Exception as e:
    print(f"MongoDB Warning: {e}")
    submissions_collection = None
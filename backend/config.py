import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# સીધી ક્રેડેન્શિયલ્સ વેલ્યુ પાસ કરો અથવા .env માંથી લોડ કરો
cloudinary.config(
    cloud_name="ldxvth8n",
    api_key="812785292319288",
    api_secret="BdHt6BJ-5sN-dXh32yGtNtjl_VY",
    secure=True
)

def upload_image_to_cloud(image_bytes: bytes, folder: str = "answer_sheets") -> str:
    try:
        response = cloudinary.uploader.upload(
            image_bytes,
            folder=folder,
            resource_type="image"
        )
        return response.get("secure_url", "")
    except Exception as e:
        print(f"[Cloudinary Warning] Upload failed: {e}")
        return ""
import cloudinary.uploader


def upload_profile_picture(file_obj, original_filename: str) -> str:
    """
    Upload a profile picture to Cloudinary and return its secure CDN URL.

    Cloudinary reads CLOUDINARY_URL from the environment automatically.
    Images are stored in the 'profile_pictures' folder, auto-cropped to a
    200×200 square thumbnail at upload time.
    """
    result = cloudinary.uploader.upload(
        file_obj,
        folder='artlinks/artlinks-profile-pics',
        transformation={'width': 200, 'height': 200, 'crop': 'fill', 'gravity': 'face'},
        resource_type='image',
    )
    return result['secure_url']

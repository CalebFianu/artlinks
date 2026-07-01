from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterThrottle(AnonRateThrottle):
    scope = 'register'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'


class UsernameCheckThrottle(AnonRateThrottle):
    scope = 'username_check'


class AvatarUploadThrottle(UserRateThrottle):
    scope = 'avatar_upload'

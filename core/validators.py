from better_profanity import profanity
from rest_framework import serializers

profanity.load_censor_words()


def check_offensive_content(value: str, field_name: str) -> None:
    if profanity.contains_profanity(value):
        raise serializers.ValidationError(f'{field_name} contains inappropriate content.')

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_move_image_to_appuser'),
    ]

    operations = [
        migrations.AddField(
            model_name='link',
            name='title',
            field=models.CharField(max_length=255, default=''),
            preserve_default=False,
        ),
    ]

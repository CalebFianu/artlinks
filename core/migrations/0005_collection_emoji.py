from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_link_title'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='emoji',
            field=models.CharField(blank=True, default='✺', max_length=10),
        ),
    ]

# Generated by Django 4.2.17 on 2025-02-08 06:06

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_user_name_alter_user_phone'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='timeslot',
            options={'ordering': ['start_time']},
        ),
        migrations.AddField(
            model_name='court',
            name='address',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='court',
            name='manager',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managed_courts', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='courttimeslot',
            name='price_override',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]

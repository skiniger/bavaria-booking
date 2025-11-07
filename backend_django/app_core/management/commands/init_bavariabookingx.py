"""
Management Command: Initialize BAVARIABOOKINGX with Demo Data

Usage:
    python manage.py init_bavariabookingx

This will create:
- Admin superuser (username: admin, password: admin123)
- Service Areas (Wirtshaus, Wintergarten, Biergarten)
- Sample Tables
- System Settings
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from app_core.models import Area, Table, SystemSettings
from django.db import IntegrityError

Employee = get_user_model()


class Command(BaseCommand):
    help = 'Initialisiert BAVARIABOOKINGX mit Demo-Daten'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Starting BAVARIABOOKINGX initialization...\n'))

        # 1. Create Superuser
        self.create_superuser()

        # 2. Create Service Areas
        self.create_areas()

        # 3. Create Tables
        self.create_tables()

        # 4. Create System Settings
        self.create_settings()

        self.stdout.write(self.style.SUCCESS('\n✅ BAVARIABOOKINGX initialized successfully!'))
        self.stdout.write(self.style.WARNING('\nLogin credentials:'))
        self.stdout.write(self.style.WARNING('  Username: admin'))
        self.stdout.write(self.style.WARNING('  Password: admin123'))
        self.stdout.write(self.style.WARNING('\nAdmin Panel: http://localhost:8000/admin/\n'))

    def create_superuser(self):
        try:
            if Employee.objects.filter(username='admin').exists():
                self.stdout.write(self.style.WARNING('  ⚠  Superuser "admin" already exists'))
                return

            admin = Employee.objects.create_superuser(
                username='admin',
                email='admin@bavariabookingx.local',
                password='admin123',
                employee_number='EMP-001',
                role='admin',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(self.style.SUCCESS('  ✓  Superuser created: admin'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗  Error creating superuser: {e}'))

    def create_areas(self):
        areas_data = [
            {'name': 'Wirtshaus', 'description': 'Hauptbereich mit rustikalem Ambiente', 'total_capacity': 60, 'color_code': '#8B4513'},
            {'name': 'Wintergarten', 'description': 'Heller Bereich mit Glasfront', 'total_capacity': 40, 'color_code': '#90EE90'},
            {'name': 'Biergarten', 'description': 'Außenbereich unter Kastanien', 'total_capacity': 80, 'color_code': '#228B22'},
        ]

        for area_data in areas_data:
            try:
                area, created = Area.objects.get_or_create(
                    name=area_data['name'],
                    defaults=area_data
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  ✓  Area created: {area.name}'))
                else:
                    self.stdout.write(self.style.WARNING(f'  ⚠  Area already exists: {area.name}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating area {area_data["name"]}: {e}'))

    def create_tables(self):
        # Wirtshaus Tables
        wirtshaus = Area.objects.filter(name='Wirtshaus').first()
        if wirtshaus:
            tables_wirtshaus = [
                ('1', 4), ('2', 4), ('3', 2), ('4', 2), ('5', 6), ('6', 6),
                ('7', 4), ('8', 4), ('9', 2), ('10', 8),
            ]
            self._create_tables_for_area(wirtshaus, tables_wirtshaus)

        # Wintergarten Tables
        wintergarten = Area.objects.filter(name='Wintergarten').first()
        if wintergarten:
            tables_wintergarten = [
                ('W1', 2), ('W2', 2), ('W3', 4), ('W4', 4), ('W5', 6),
                ('W6', 4), ('W7', 2), ('W8', 4),
            ]
            self._create_tables_for_area(wintergarten, tables_wintergarten)

        # Biergarten Tables
        biergarten = Area.objects.filter(name='Biergarten').first()
        if biergarten:
            tables_biergarten = [
                ('B1', 8), ('B2', 8), ('B3', 6), ('B4', 6), ('B5', 4),
                ('B6', 4), ('B7', 10), ('B8', 6), ('B9', 4), ('B10', 8),
            ]
            self._create_tables_for_area(biergarten, tables_biergarten)

    def _create_tables_for_area(self, area, tables_data):
        for table_number, capacity in tables_data:
            try:
                table, created = Table.objects.get_or_create(
                    area=area,
                    table_number=table_number,
                    defaults={'capacity': capacity, 'is_reservable': True, 'status': 'available'}
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  ✓  Table created: {area.name} - {table_number} ({capacity} seats)'))
            except IntegrityError:
                pass  # Table already exists

    def create_settings(self):
        try:
            if SystemSettings.objects.exists():
                self.stdout.write(self.style.WARNING('  ⚠  SystemSettings already exist'))
                return

            settings = SystemSettings.objects.create(
                company_name='Bavaria Gasthaus & Pension',
                company_street='Hauptstraße 42',
                company_postal_code='83022',
                company_city='Rosenheim',
                company_phone='+49 8031 12345',
                company_email='info@bavaria-gasthaus.de',
                company_website='https://bavaria-gasthaus.de',
                tax_id='123/456/78910',
                vat_id='DE123456789',
                default_reservation_duration=120,
                reservation_lead_time=90,
                max_guests_per_reservation=20,
                tourist_tax_rate=2.50,
                tourist_tax_enabled=True,
                auto_logout_hours=24,
                timezone='Europe/Berlin',
                language='de',
                backup_frequency_hours=8,
                gdpr_consent_text='Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß der Datenschutzerklärung zu.',
                gdpr_guest_retention_months=24,
                gdpr_reservation_retention_months=12,
                gdpr_timetracking_retention_years=10,
            )
            self.stdout.write(self.style.SUCCESS('  ✓  SystemSettings created'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗  Error creating SystemSettings: {e}'))

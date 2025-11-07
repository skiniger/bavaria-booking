"""
Management Command: Generate Realistic Demo Data for BAVARIABOOKINGX

Usage:
    python manage.py generate_demo_data

This will create:
- Realistic Bavarian guests
- Reservations for current week
- Time tracking data for staff
- MeitiAI chat conversations
- Analytics snapshots

Note: Run 'init_bavariabookingx' first to set up basic structure.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
from app_core.models import (
    Area, Table, Guest, Reservation, Employee, TimeTracking,
    PensionGuest, RegistrationForm, ChatConversation, ChatMessage,
    AnalyticsSnapshot, OpeningHours
)

Employee = get_user_model()


class Command(BaseCommand):
    help = 'Generiert realistische Demo-Daten für BAVARIABOOKINGX'

    def __init__(self):
        super().__init__()
        self.bavarian_first_names = [
            'Hans', 'Franz', 'Ludwig', 'Georg', 'Max', 'Josef', 'Andreas', 'Michael',
            'Thomas', 'Stefan', 'Markus', 'Peter', 'Klaus', 'Matthias', 'Sebastian',
            'Maria', 'Anna', 'Elisabeth', 'Katharina', 'Barbara', 'Christine', 'Monika',
            'Petra', 'Sabine', 'Andrea', 'Gisela', 'Ingrid', 'Helga', 'Rosa'
        ]
        self.bavarian_last_names = [
            'Müller', 'Huber', 'Schmid', 'Gruber', 'Bauer', 'Wagner', 'Eder',
            'Fischer', 'Berger', 'Steiner', 'Maier', 'Obermeier', 'Zimmermann',
            'Schuster', 'Winkler', 'Weber', 'Hofmann', 'Brunner', 'Maurer', 'Schäfer'
        ]
        self.bavarian_cities = [
            ('München', '80331'), ('Rosenheim', '83022'), ('Garmisch-Partenkirchen', '82467'),
            ('Bad Tölz', '83646'), ('Berchtesgaden', '83471'), ('Landshut', '84028'),
            ('Freising', '85354'), ('Traunstein', '83278'), ('Miesbach', '83714'),
            ('Starnberg', '82319'), ('Fürstenfeldbruck', '82256'), ('Erding', '85435')
        ]
        self.bavarian_streets = [
            'Hauptstraße', 'Kirchstraße', 'Dorfstraße', 'Bahnhofstraße', 'Bergstraße',
            'Seestraße', 'Waldstraße', 'Wiener Straße', 'Münchner Straße', 'Marienplatz'
        ]

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🎨 Starting Demo Data Generation...\n'))

        # Check if basic setup exists
        if not Area.objects.exists():
            self.stdout.write(self.style.ERROR('❌ Error: No areas found. Run "python manage.py init_bavariabookingx" first!'))
            return

        # 1. Create Staff Members
        self.create_staff()

        # 2. Create Restaurant Guests
        self.create_guests()

        # 3. Create Reservations for Current Week
        self.create_reservations()

        # 4. Create Pension Guests
        self.create_pension_guests()

        # 5. Create Registration Forms
        self.create_registration_forms()

        # 6. Create Time Tracking Data
        self.create_time_tracking()

        # 7. Create Opening Hours
        self.create_opening_hours()

        # 8. Create MeitiAI Chat Conversations
        self.create_chat_conversations()

        # 9. Create Analytics Snapshots
        self.create_analytics_snapshots()

        self.stdout.write(self.style.SUCCESS('\n✅ Demo Data Generation completed successfully!'))
        self.stdout.write(self.style.SUCCESS('\n📊 Summary:'))
        self.stdout.write(f'  • Guests: {Guest.objects.count()}')
        self.stdout.write(f'  • Reservations: {Reservation.objects.count()}')
        self.stdout.write(f'  • Staff: {Employee.objects.count()}')
        self.stdout.write(f'  • Time Trackings: {TimeTracking.objects.count()}')
        self.stdout.write(f'  • Pension Guests: {PensionGuest.objects.count()}')
        self.stdout.write(f'  • Registration Forms: {RegistrationForm.objects.count()}')
        self.stdout.write(f'  • Chat Messages: {ChatMessage.objects.count()}')
        self.stdout.write(f'  • Analytics Snapshots: {AnalyticsSnapshot.objects.count()}\n')

    def create_staff(self):
        self.stdout.write('Creating staff members...')

        staff_data = [
            ('EMP-002', 'Max', 'Gruber', 'staff', 'max.gruber@bavaria.de'),
            ('EMP-003', 'Anna', 'Müller', 'staff', 'anna.mueller@bavaria.de'),
            ('EMP-004', 'Franz', 'Huber', 'staff', 'franz.huber@bavaria.de'),
            ('EMP-005', 'Maria', 'Berger', 'staff', 'maria.berger@bavaria.de'),
            ('EMP-006', 'Josef', 'Wagner', 'staff', 'josef.wagner@bavaria.de'),
            ('EMP-007', 'Elisabeth', 'Schmid', 'manager', 'elisabeth.schmid@bavaria.de'),
        ]

        for emp_num, first, last, role, email in staff_data:
            try:
                if not Employee.objects.filter(employee_number=emp_num).exists():
                    emp = Employee.objects.create_user(
                        username=f'{first.lower()}.{last.lower()}',
                        email=email,
                        password='demo123',
                        employee_number=emp_num,
                        role=role,
                        first_name=first,
                        last_name=last,
                        is_active_employee=True,
                        phone=f'+49 {random.randint(151, 179)} {random.randint(1000000, 9999999)}'
                    )
                    self.stdout.write(self.style.SUCCESS(f'  ✓  Staff created: {first} {last} ({role})'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating staff: {e}'))

    def create_guests(self):
        self.stdout.write('Creating restaurant guests...')

        for i in range(30):
            first_name = random.choice(self.bavarian_first_names)
            last_name = random.choice(self.bavarian_last_names)
            city, postal = random.choice(self.bavarian_cities)

            phone_number = f'+49 {random.randint(151, 179)} {random.randint(1000000, 9999999)}'
            email = f'{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@example.de'

            try:
                guest, created = Guest.objects.get_or_create(
                    phone_number=phone_number,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'notes': random.choice([
                            'Stammgast aus ' + city,
                            'Vegetarisch',
                            'Allergie: Nüsse',
                            'Bevorzugt Fensterplatz',
                            'Hundefreundlich',
                            'Geburtstagsgast',
                            ''
                        ]),
                        'gdpr_consent': True,
                        'gdpr_consent_date': timezone.now()
                    }
                )
                if created:
                    self.stdout.write(f'  ✓  Guest created: {first_name} {last_name}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating guest: {e}'))

    def create_reservations(self):
        self.stdout.write('Creating reservations for current week...')

        guests = list(Guest.objects.all())
        tables = list(Table.objects.all())

        if not guests or not tables:
            self.stdout.write(self.style.WARNING('  ⚠  No guests or tables found, skipping reservations'))
            return

        today = timezone.now().date()

        # Create reservations for the past 3 days and next 7 days
        for day_offset in range(-3, 8):
            date = today + timedelta(days=day_offset)

            # More reservations on Friday/Saturday
            is_weekend = date.weekday() in [4, 5]
            num_reservations = random.randint(15, 25) if is_weekend else random.randint(5, 12)

            for _ in range(num_reservations):
                guest = random.choice(guests)
                table = random.choice(tables)

                # Lunch (11:30-14:00) or Dinner (17:30-21:00)
                is_dinner = random.choice([True, False, True])  # 2/3 dinner
                if is_dinner:
                    hour = random.randint(17, 20)
                    minute = random.choice([0, 30])
                else:
                    hour = random.randint(11, 13)
                    minute = random.choice([0, 30])

                reservation_time = timezone.make_aware(
                    datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
                )

                # Status: past = confirmed, today/future = mix
                if day_offset < 0:
                    status = 'confirmed'
                elif day_offset == 0:
                    status = random.choice(['confirmed', 'pending_confirmation'])
                else:
                    status = random.choice(['confirmed', 'pending_confirmation', 'pending_confirmation'])

                try:
                    reservation, created = Reservation.objects.get_or_create(
                        guest=guest,
                        table=table,
                        reservation_time=reservation_time,
                        defaults={
                            'number_of_guests': random.randint(2, table.capacity),
                            'duration_minutes': random.choice([90, 120, 150]),
                            'status': status,
                            'notes': random.choice([
                                'Fensterplatz gewünscht',
                                'Hochstuhl benötigt',
                                'Geburtstag',
                                'Geschäftsessen',
                                '',
                                ''
                            ])
                        }
                    )
                    if created:
                        if day_offset == 0:
                            self.stdout.write(f'  ✓  Reservation TODAY: {guest.first_name} {guest.last_name} at {hour}:{minute:02d}')
                except Exception as e:
                    pass  # Skip conflicting reservations

    def create_pension_guests(self):
        self.stdout.write('Creating pension guests...')

        countries = ['Deutschland', 'Österreich', 'Schweiz', 'Italien', 'Frankreich', 'Niederlande']

        for i in range(15):
            first_name = random.choice(self.bavarian_first_names)
            last_name = random.choice(self.bavarian_last_names)
            city, postal = random.choice(self.bavarian_cities)
            street = random.choice(self.bavarian_streets)
            house_number = str(random.randint(1, 99))
            country = random.choice(countries)
            salutation = 'herr' if first_name in ['Hans', 'Franz', 'Ludwig', 'Georg', 'Max', 'Josef'] else 'frau'

            try:
                guest, created = PensionGuest.objects.get_or_create(
                    document_number=f'P{random.randint(100000, 999999)}',
                    defaults={
                        'salutation': salutation,
                        'first_name': first_name,
                        'last_name': last_name,
                        'birth_date': datetime.now().date() - timedelta(days=random.randint(8000, 25000)),
                        'nationality': country,
                        'document_type': random.choice(['passport', 'id_card', 'driving_license']),
                        'street': street,
                        'house_number': house_number,
                        'postal_code': postal,
                        'city': city,
                        'country': country,
                        'email': f'{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@example.de'
                    }
                )
                if created:
                    self.stdout.write(f'  ✓  Pension guest created: {first_name} {last_name}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error: {e}'))

    def create_registration_forms(self):
        self.stdout.write('Creating registration forms...')

        pension_guests = list(PensionGuest.objects.all())
        if not pension_guests:
            self.stdout.write(self.style.WARNING('  ⚠  No pension guests found'))
            return

        today = timezone.now().date()

        # Current guests (checked in)
        for i in range(5):
            guest = random.choice(pension_guests)
            arrival = today - timedelta(days=random.randint(0, 3))
            departure = today + timedelta(days=random.randint(1, 7))

            try:
                form, created = RegistrationForm.objects.get_or_create(
                    guest=guest,
                    arrival_date=arrival,
                    defaults={
                        'departure_date': departure,
                        'travel_purpose': random.choice(['private', 'business']),
                        'room_number': f'{random.randint(101, 120)}',
                        'room_price_per_night': random.uniform(60, 120),
                        'payment_method': random.choice(['cash', 'ec', 'credit_card']),
                        'status': 'checked_in',
                        'breakfast_included': random.choice([True, False]),
                        'breakfast_price': 12.50 if random.choice([True, False]) else 0,
                    }
                )
                if created:
                    self.stdout.write(f'  ✓  Registration (checked in): {guest.first_name} {guest.last_name}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating registration: {e}'))

        # Future reservations
        for i in range(8):
            guest = random.choice(pension_guests)
            arrival = today + timedelta(days=random.randint(1, 14))
            departure = arrival + timedelta(days=random.randint(2, 7))

            try:
                form, created = RegistrationForm.objects.get_or_create(
                    guest=guest,
                    arrival_date=arrival,
                    defaults={
                        'departure_date': departure,
                        'travel_purpose': random.choice(['private', 'business']),
                        'room_number': f'{random.randint(101, 120)}',
                        'room_price_per_night': random.uniform(60, 120),
                        'payment_method': 'cash',
                        'status': 'confirmed',
                        'breakfast_included': True,
                        'breakfast_price': 12.50,
                    }
                )
                if created:
                    self.stdout.write(f'  ✓  Registration (confirmed): {guest.first_name} {guest.last_name}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating registration: {e}'))

    def create_time_tracking(self):
        self.stdout.write('Creating time tracking data...')

        employees = Employee.objects.filter(role__in=['staff', 'manager']).exclude(username='admin')

        for employee in employees:
            # Create tracking for past 7 days
            for day_offset in range(-7, 0):
                date = timezone.now().date() + timedelta(days=day_offset)

                # Not everyone works every day
                if random.random() < 0.3:
                    continue

                # Morning or evening shift
                is_morning = random.choice([True, False])
                if is_morning:
                    check_in_hour = random.randint(8, 10)
                    duration_hours = random.uniform(6, 8)
                else:
                    check_in_hour = random.randint(16, 18)
                    duration_hours = random.uniform(5, 7)

                check_in_time = timezone.make_aware(
                    datetime.combine(date, datetime.min.time().replace(hour=check_in_hour, minute=random.choice([0, 15, 30])))
                )
                check_out_time = check_in_time + timedelta(hours=duration_hours, minutes=random.randint(0, 30))

                try:
                    tracking, created = TimeTracking.objects.get_or_create(
                        employee=employee,
                        check_in=check_in_time,
                        defaults={
                            'check_out': check_out_time,
                            'manual_correction': False,
                            'auto_logout': False
                        }
                    )
                    if created and day_offset == -1:
                        self.stdout.write(f'  ✓  Time tracking: {employee.first_name} {employee.last_name}')
                except Exception as e:
                    pass

    def create_opening_hours(self):
        self.stdout.write('Creating opening hours...')

        areas = Area.objects.all()
        weekdays = [
            ('monday', 'Montag'),
            ('tuesday', 'Dienstag'),
            ('wednesday', 'Mittwoch'),
            ('thursday', 'Donnerstag'),
            ('friday', 'Freitag'),
            ('saturday', 'Samstag'),
            ('sunday', 'Sonntag'),
        ]

        for area in areas:
            for day_code, day_name in weekdays:
                # Biergarten has different hours
                if area.name == 'Biergarten':
                    open_time = '11:00'
                    close_time = '22:00'
                    is_closed = day_code == 'monday'
                else:
                    open_time = '11:30'
                    close_time = '22:00'
                    is_closed = False

                try:
                    hours, created = OpeningHours.objects.get_or_create(
                        area=area,
                        day_of_week=day_code,
                        defaults={
                            'open_time': open_time,
                            'close_time': close_time,
                            'is_closed': is_closed,
                        }
                    )
                    if created:
                        status = 'geschlossen' if is_closed else f'{open_time}-{close_time}'
                        self.stdout.write(f'  ✓  Opening hours: {area.name} - {day_name}: {status}')
                except Exception as e:
                    pass

    def create_chat_conversations(self):
        self.stdout.write('Creating MeitiAI chat conversations...')

        employees = list(Employee.objects.all()[:3])
        if not employees:
            self.stdout.write(self.style.WARNING('  ⚠  No employees found'))
            return

        conversations_data = [
            {
                'title': 'Reservierungen für morgen',
                'messages': [
                    ('user', 'Wie viele Reservierungen haben wir morgen Abend?'),
                    ('assistant', 'Basierend auf den aktuellen Daten haben Sie morgen Abend 12 Reservierungen zwischen 18:00 und 21:00 Uhr. Die Auslastung liegt bei ca. 75%.'),
                    ('user', 'Welche Tische sind noch frei?'),
                    ('assistant', 'Folgende Tische sind noch verfügbar: Tisch 3 (2 Personen), Tisch 7 (4 Personen) und Tisch 9 (2 Personen) im Wirtshaus. Im Wintergarten sind W2 und W5 frei.'),
                ]
            },
            {
                'title': 'Kapazitätsempfehlung Wochenende',
                'messages': [
                    ('user', 'Soll ich am Samstag zusätzliche Tische im Biergarten aufstellen?'),
                    ('assistant', 'Ja, das empfehle ich! Die Wettervorhersage zeigt 24°C und sonnig. Basierend auf historischen Daten erwarte ich eine Auslastung von 85-90% im Biergarten. 2-3 zusätzliche Tische wären optimal.'),
                ]
            },
            {
                'title': 'Personalplanung',
                'messages': [
                    ('user', 'Wie viele Servicekräfte brauchen wir Freitag Abend?'),
                    ('assistant', 'Für Freitag Abend empfehle ich mindestens 3 Servicekräfte. Sie haben 15 Reservierungen plus Walk-ins. Bei dieser Auslastung ist ein guter Service mit 3 Personen gewährleistet.'),
                    ('user', 'Perfekt, danke!'),
                    ('assistant', 'Gerne! Viel Erfolg am Freitag! 😊'),
                ]
            },
        ]

        for i, conv_data in enumerate(conversations_data):
            try:
                employee = employees[i % len(employees)]
                conversation, created = ChatConversation.objects.get_or_create(
                    title=conv_data['title'],
                    employee=employee,
                    defaults={
                        'is_active': i == 0,
                    }
                )

                if created:
                    self.stdout.write(f'  ✓  Conversation: {conv_data["title"]}')

                    for role, content in conv_data['messages']:
                        ChatMessage.objects.create(
                            conversation=conversation,
                            role=role,
                            content=content,
                        )
                        self.stdout.write(f'      → Message ({role}): {content[:50]}...')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error: {e}'))

    def create_analytics_snapshots(self):
        self.stdout.write('Creating analytics snapshots...')

        # Create snapshots for past 30 days
        for day_offset in range(-30, 1):
            date = timezone.now().date() + timedelta(days=day_offset)

            # Weekend has higher numbers
            is_weekend = date.weekday() in [4, 5, 6]

            if is_weekend:
                reservations = random.randint(18, 28)
                occupancy = random.uniform(0.75, 0.95)
                revenue = random.uniform(2500, 4500)
            else:
                reservations = random.randint(8, 18)
                occupancy = random.uniform(0.45, 0.70)
                revenue = random.uniform(1200, 2200)

            try:
                snapshot, created = AnalyticsSnapshot.objects.get_or_create(
                    snapshot_date=date,
                    defaults={
                        'total_reservations': reservations,
                        'confirmed_reservations': int(reservations * 0.9),
                        'cancelled_reservations': int(reservations * 0.1),
                        'no_show_count': int(reservations * 0.05),
                        'total_guests_served': int(reservations * random.uniform(2.2, 3.5)),
                        'average_party_size': random.uniform(2.0, 4.0),
                        'average_occupancy_rate': occupancy,
                        'total_revenue': revenue,
                    }
                )
                if created and day_offset >= -7:
                    self.stdout.write(f'  ✓  Snapshot: {date} - {reservations} reservations, {occupancy*100:.0f}% occupancy')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗  Error creating snapshot for {date}: {e}'))

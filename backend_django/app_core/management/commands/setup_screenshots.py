"""
Management Command: Setup Screenshot-Ready Scenarios

Usage:
    python manage.py setup_screenshots [scenario]

Scenarios:
    busy_saturday    - Ausgebuchter Samstag Abend (hohe Auslastung)
    quiet_monday     - Ruhiger Montag Vormittag (niedrige Auslastung)
    combinations     - Tischkombinationen in Nutzung
    all             - Alle Szenarien (default)

Creates perfect scenarios for screenshots and demonstrations.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
from app_core.models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm,
    ChatConversation, ChatMessage, AnalyticsSnapshot
)

Employee = get_user_model()


class Command(BaseCommand):
    help = 'Setup screenshot-ready scenarios for BAVARIABOOKINGX'

    def add_arguments(self, parser):
        parser.add_argument(
            'scenario',
            nargs='?',
            default='all',
            choices=['busy_saturday', 'quiet_monday', 'combinations', 'all'],
            help='Which scenario to setup'
        )

    def handle(self, *args, **options):
        scenario = options['scenario']

        self.stdout.write(self.style.SUCCESS(f'📸 Setting up screenshot scenarios: {scenario}\n'))

        if scenario == 'all' or scenario == 'busy_saturday':
            self.setup_busy_saturday()

        if scenario == 'all' or scenario == 'quiet_monday':
            self.setup_quiet_monday()

        if scenario == 'all' or scenario == 'combinations':
            self.setup_table_combinations()

        # Always create interesting analytics
        self.setup_analytics_trends()

        self.stdout.write(self.style.SUCCESS('\n✅ Screenshot scenarios ready!'))
        self.stdout.write(self.style.SUCCESS('📸 Perfect for presentations and demos\n'))

    def setup_busy_saturday(self):
        """Create a busy Saturday evening scenario - fully booked"""
        self.stdout.write(self.style.SUCCESS('📅 Setting up: Busy Saturday Evening'))

        # Get next Saturday
        today = timezone.now().date()
        days_ahead = 5 - today.weekday()  # Saturday = 5
        if days_ahead <= 0:
            days_ahead += 7
        saturday = today + timedelta(days=days_ahead)

        # Get all tables
        tables = list(Table.objects.all())
        guests = list(Guest.objects.all())

        if not guests:
            self.stdout.write(self.style.WARNING('  ⚠  No guests found. Run generate_demo_data first.'))
            return

        # Create reservations for prime time (18:00-21:00)
        time_slots = [
            (18, 0), (18, 30), (19, 0), (19, 30), (20, 0), (20, 30), (21, 0)
        ]

        created_count = 0
        for table in tables:
            # 90% of tables booked on Saturday evening
            if random.random() < 0.9:
                hour, minute = random.choice(time_slots)
                guest = random.choice(guests)

                reservation_time = timezone.make_aware(
                    datetime.combine(saturday, datetime.min.time().replace(hour=hour, minute=minute))
                )

                try:
                    reservation, created = Reservation.objects.get_or_create(
                        table=table,
                        reservation_time=reservation_time,
                        defaults={
                            'guest': guest,
                            'number_of_guests': random.randint(2, table.capacity),
                            'duration_minutes': random.choice([120, 150]),
                            'status': 'confirmed',
                            'notes': random.choice([
                                'Fensterplatz gewünscht',
                                'Geburtstag - Kerze bitte',
                                'VIP Gast',
                                'Jubiläum',
                                ''
                            ])
                        }
                    )
                    if created:
                        created_count += 1
                except:
                    pass

        self.stdout.write(f'  ✓  Created {created_count} reservations for Saturday {saturday}')
        self.stdout.write(f'  ✓  Auslastung: ~90% (prime time 18:00-21:00)')

    def setup_quiet_monday(self):
        """Create a quiet Monday morning scenario - low occupancy"""
        self.stdout.write(self.style.SUCCESS('📅 Setting up: Quiet Monday Morning'))

        # Get next Monday
        today = timezone.now().date()
        days_ahead = 0 - today.weekday()  # Monday = 0
        if days_ahead <= 0:
            days_ahead += 7
        monday = today + timedelta(days=days_ahead)

        # Get some tables (only Wirtshaus and Wintergarten open)
        wirtshaus = Area.objects.filter(name='Wirtshaus').first()
        wintergarten = Area.objects.filter(name='Wintergarten').first()

        if not wirtshaus:
            return

        tables = list(Table.objects.filter(area__in=[wirtshaus, wintergarten])[:5])
        guests = list(Guest.objects.all()[:10])

        if not guests:
            return

        # Create few lunch reservations (11:30-13:00)
        time_slots = [(11, 30), (12, 0), (12, 30), (13, 0)]

        created_count = 0
        for i in range(3):  # Only 3 reservations
            table = random.choice(tables)
            guest = random.choice(guests)
            hour, minute = random.choice(time_slots)

            reservation_time = timezone.make_aware(
                datetime.combine(monday, datetime.min.time().replace(hour=hour, minute=minute))
            )

            try:
                reservation, created = Reservation.objects.get_or_create(
                    table=table,
                    reservation_time=reservation_time,
                    defaults={
                        'guest': guest,
                        'number_of_guests': 2,
                        'duration_minutes': 90,
                        'status': 'confirmed',
                        'notes': 'Business Lunch'
                    }
                )
                if created:
                    created_count += 1
            except:
                pass

        self.stdout.write(f'  ✓  Created {created_count} reservations for Monday {monday}')
        self.stdout.write(f'  ✓  Auslastung: ~15% (ruhiger Vormittag)')

    def setup_table_combinations(self):
        """Create active table combinations for screenshots"""
        self.stdout.write(self.style.SUCCESS('🔗 Setting up: Table Combinations'))

        # Get tables from same areas
        wirtshaus = Area.objects.filter(name='Wirtshaus').first()
        if not wirtshaus:
            return

        tables = list(Table.objects.filter(area=wirtshaus)[:4])
        if len(tables) < 2:
            return

        # Create 2 combinations
        combinations_data = [
            {
                'tables': tables[:2],
                'name': 'Kombination Tisch 1+2',
                'reason': 'Große Gruppe (10 Personen)',
                'combined_capacity': sum(t.capacity for t in tables[:2])
            },
            {
                'tables': tables[2:4] if len(tables) >= 4 else tables[:2],
                'name': 'Kombination Tisch 3+4',
                'reason': 'Firmenfeier',
                'combined_capacity': sum(t.capacity for t in (tables[2:4] if len(tables) >= 4 else tables[:2]))
            }
        ]

        created_count = 0
        for combo_data in combinations_data:
            try:
                combo, created = TableCombination.objects.get_or_create(
                    name=combo_data['name'],
                    defaults={
                        'combined_capacity': combo_data['combined_capacity'],
                        'is_active': True,
                        'notes': combo_data['reason']
                    }
                )
                if created:
                    combo.tables.set(combo_data['tables'])
                    created_count += 1
                    self.stdout.write(f'  ✓  Combination: {combo.name} ({combo.combined_capacity} Plätze)')
            except:
                pass

        # Create reservation for combination
        if created_count > 0:
            guests = list(Guest.objects.all())
            if guests:
                tomorrow = timezone.now().date() + timedelta(days=1)
                reservation_time = timezone.make_aware(
                    datetime.combine(tomorrow, datetime.min.time().replace(hour=19, minute=0))
                )

                combo = TableCombination.objects.filter(is_active=True).first()
                if combo:
                    try:
                        Reservation.objects.get_or_create(
                            reservation_time=reservation_time,
                            number_of_guests=combo.combined_capacity - 2,
                            defaults={
                                'guest': random.choice(guests),
                                'duration_minutes': 180,
                                'status': 'confirmed',
                                'notes': f'Tischkombination: {combo.name} - {combo.notes}'
                            }
                        )
                        self.stdout.write(f'  ✓  Reservation for combination created')
                    except:
                        pass

    def setup_analytics_trends(self):
        """Create analytics data with clear upward trend"""
        self.stdout.write(self.style.SUCCESS('📊 Setting up: Analytics Trends'))

        # Create data showing growth trend over last 14 days
        base_date = timezone.now().date() - timedelta(days=14)

        created_count = 0
        for day_offset in range(14):
            date = base_date + timedelta(days=day_offset)

            # Progressive increase (growth trend)
            base_reservations = 10 + (day_offset * 1.5)
            is_weekend = date.weekday() in [4, 5, 6]

            if is_weekend:
                reservations = int(base_reservations * 1.8)
                occupancy = 0.70 + (day_offset * 0.015)
                revenue = 2500 + (day_offset * 150)
            else:
                reservations = int(base_reservations)
                occupancy = 0.45 + (day_offset * 0.01)
                revenue = 1500 + (day_offset * 100)

            # Cap at realistic values
            occupancy = min(occupancy, 0.95)
            reservations = int(min(reservations, 28))

            try:
                snapshot, created = AnalyticsSnapshot.objects.get_or_create(
                    snapshot_date=date,
                    defaults={
                        'total_reservations': reservations,
                        'confirmed_reservations': int(reservations * 0.92),
                        'cancelled_reservations': int(reservations * 0.05),
                        'no_show_count': int(reservations * 0.03),
                        'total_guests_served': int(reservations * 2.8),
                        'average_party_size': 2.8,
                        'average_occupancy_rate': occupancy,
                        'total_revenue': revenue,
                        'ai_insights': [
                            {
                                'type': 'growth',
                                'message': f'Reservierungen um {int((day_offset/14)*100)}% gestiegen',
                                'confidence': 0.85
                            }
                        ] if day_offset > 7 else []
                    }
                )
                if created:
                    created_count += 1
            except:
                pass

        self.stdout.write(f'  ✓  Created {created_count} analytics snapshots with growth trend')
        self.stdout.write(f'  ✓  Showing clear upward trend over 14 days')

        # Create today's snapshot with peak values
        today = timezone.now().date()
        try:
            snapshot, created = AnalyticsSnapshot.objects.get_or_create(
                snapshot_date=today,
                defaults={
                    'total_reservations': 24,
                    'confirmed_reservations': 22,
                    'cancelled_reservations': 1,
                    'no_show_count': 1,
                    'total_guests_served': 68,
                    'average_party_size': 2.8,
                    'average_occupancy_rate': 0.88,
                    'total_revenue': 3850.00,
                    'ai_insights': [
                        {
                            'type': 'peak',
                            'message': 'Heute höchste Auslastung der Woche (88%)',
                            'confidence': 0.95
                        },
                        {
                            'type': 'recommendation',
                            'message': 'Zusätzliches Personal für Wochenende empfohlen',
                            'confidence': 0.82
                        }
                    ]
                }
            )
            if created:
                self.stdout.write(f'  ✓  Today\'s snapshot created with peak values')
        except:
            pass

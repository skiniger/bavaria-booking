"""
PDF Export Utilities for BAVARIABOOKINGX
Generates professional PDF documents for reservations and registration forms
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class PDFExporter:
    """Base class for PDF exports with common formatting"""

    COMPANY_NAME = "BAVARIABOOKINGX"
    COMPANY_ADDRESS = "Hauptstraße 1, 80331 München"
    COMPANY_PHONE = "+49 89 123456"
    COMPANY_EMAIL = "info@bavaria-booking.de"
    COMPANY_WEBSITE = "www.bavaria-booking.de"

    # Colors
    COLOR_PRIMARY = colors.HexColor('#1e40af')  # bavaria-blue
    COLOR_SECONDARY = colors.HexColor('#64748b')  # gray
    COLOR_ACCENT = colors.HexColor('#10b981')  # green
    COLOR_LIGHT = colors.HexColor('#f1f5f9')  # light gray

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=self.COLOR_PRIMARY,
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='CompanyInfo',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.COLOR_SECONDARY,
            alignment=TA_CENTER,
            spaceAfter=20
        ))

        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=self.COLOR_PRIMARY,
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='FieldLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.COLOR_SECONDARY,
            fontName='Helvetica-Bold'
        ))

        self.styles.add(ParagraphStyle(
            name='FieldValue',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black
        ))

    def _add_header(self, elements):
        """Add company header to PDF"""
        elements.append(Paragraph(self.COMPANY_NAME, self.styles['CompanyName']))

        info_text = f"{self.COMPANY_ADDRESS} • Tel: {self.COMPANY_PHONE}<br/>"
        info_text += f"Email: {self.COMPANY_EMAIL} • Web: {self.COMPANY_WEBSITE}"
        elements.append(Paragraph(info_text, self.styles['CompanyInfo']))

        # Add horizontal line
        line_table = Table([['']], colWidths=[180*mm])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 2, self.COLOR_PRIMARY),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 10*mm))

    def _add_footer(self, canvas, doc):
        """Add footer to each page"""
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(self.COLOR_SECONDARY)

        footer_text = f"Erstellt am {datetime.now().strftime('%d.%m.%Y um %H:%M Uhr')} • {self.COMPANY_NAME}"
        canvas.drawCentredString(A4[0] / 2, 15*mm, footer_text)

        # Page number
        page_num = f"Seite {doc.page}"
        canvas.drawRightString(A4[0] - 20*mm, 15*mm, page_num)

        canvas.restoreState()

    def _format_date(self, date_value):
        """Format date in German format"""
        if not date_value:
            return "—"
        if isinstance(date_value, str):
            try:
                date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                return date_value
        return date_value.strftime('%d.%m.%Y')

    def _format_datetime(self, datetime_value):
        """Format datetime in German format"""
        if not datetime_value:
            return "—"
        if isinstance(datetime_value, str):
            try:
                datetime_value = datetime.fromisoformat(datetime_value.replace('Z', '+00:00'))
            except:
                return datetime_value
        return datetime_value.strftime('%d.%m.%Y um %H:%M Uhr')

    def _format_currency(self, amount):
        """Format currency in German format"""
        if amount is None:
            return "—"
        return f"{amount:,.2f} €".replace(',', 'X').replace('.', ',').replace('X', '.')


class ReservationPDFExporter(PDFExporter):
    """Export reservations as PDF"""

    def generate_single_reservation(self, reservation):
        """Generate PDF for a single reservation"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=25*mm
        )

        elements = []

        # Header
        self._add_header(elements)

        # Title
        title = Paragraph("Reservierungsbestätigung", self.styles['SectionTitle'])
        elements.append(title)
        elements.append(Spacer(1, 5*mm))

        # Reservation details
        data = [
            ['Reservierungs-ID:', reservation.reservation_id or '—'],
            ['Datum:', self._format_date(reservation.date)],
            ['Uhrzeit:', reservation.time.strftime('%H:%M Uhr') if reservation.time else '—'],
            ['Status:', self._get_status_text(reservation.status)],
            ['', ''],
        ]

        # Guest information
        guest = reservation.guest
        data.extend([
            ['Gast:', ''],
            ['Name:', f"{guest.first_name} {guest.last_name}"],
            ['E-Mail:', guest.email or '—'],
            ['Telefon:', guest.phone_number or '—'],
            ['', ''],
        ])

        # Table and party details
        data.extend([
            ['Tisch:', f"Tisch {reservation.table.table_number}" if reservation.table else '—'],
            ['Anzahl Gäste:', str(reservation.party_size)],
            ['Dauer (Min.):', str(reservation.duration_minutes) if reservation.duration_minutes else '—'],
            ['', ''],
        ])

        # Special requests
        if reservation.special_requests:
            data.append(['Besondere Wünsche:', reservation.special_requests])

        if guest.allergies:
            data.append(['Allergien:', guest.allergies])

        # Create table
        table = Table(data, colWidths=[60*mm, 110*mm])
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONT', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), self.COLOR_SECONDARY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

        # Notes section
        if reservation.notes:
            elements.append(Spacer(1, 10*mm))
            elements.append(Paragraph("Notizen:", self.styles['SectionTitle']))
            elements.append(Paragraph(reservation.notes, self.styles['FieldValue']))

        # Footer info
        elements.append(Spacer(1, 15*mm))
        footer_info = """
        <para align="center" fontSize="9" textColor="#64748b">
        Vielen Dank für Ihre Reservierung!<br/>
        Bei Fragen oder Änderungen kontaktieren Sie uns bitte.<br/>
        Wir freuen uns auf Ihren Besuch!
        </para>
        """
        elements.append(Paragraph(footer_info, self.styles['Normal']))

        # Build PDF
        doc.build(elements, onFirstPage=self._add_footer, onLaterPages=self._add_footer)

        buffer.seek(0)
        return buffer

    def generate_reservation_list(self, reservations, date_from=None, date_to=None):
        """Generate PDF for multiple reservations"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15*mm,
            leftMargin=15*mm,
            topMargin=20*mm,
            bottomMargin=25*mm
        )

        elements = []

        # Header
        self._add_header(elements)

        # Title
        title_text = "Reservierungsliste"
        if date_from and date_to:
            title_text += f" ({self._format_date(date_from)} - {self._format_date(date_to)})"
        elements.append(Paragraph(title_text, self.styles['SectionTitle']))
        elements.append(Spacer(1, 5*mm))

        # Summary
        summary_text = f"Anzahl Reservierungen: <b>{len(reservations)}</b>"
        elements.append(Paragraph(summary_text, self.styles['Normal']))
        elements.append(Spacer(1, 5*mm))

        # Table header
        data = [['Datum', 'Zeit', 'Gast', 'Tisch', 'Pers.', 'Status']]

        # Table rows
        for res in reservations:
            data.append([
                self._format_date(res.date),
                res.time.strftime('%H:%M') if res.time else '—',
                f"{res.guest.first_name} {res.guest.last_name}",
                f"T{res.table.table_number}" if res.table else '—',
                str(res.party_size),
                self._get_status_text(res.status)[:3].upper()
            ])

        # Create table
        col_widths = [28*mm, 20*mm, 50*mm, 18*mm, 18*mm, 26*mm]
        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), self.COLOR_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Body
            ('FONT', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (3, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, self.COLOR_SECONDARY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLOR_LIGHT]),

            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)

        # Build PDF
        doc.build(elements, onFirstPage=self._add_footer, onLaterPages=self._add_footer)

        buffer.seek(0)
        return buffer

    def _get_status_text(self, status):
        """Convert status code to German text"""
        status_map = {
            'pending': 'Ausstehend',
            'confirmed': 'Bestätigt',
            'seated': 'Platziert',
            'completed': 'Abgeschlossen',
            'cancelled': 'Storniert',
            'no_show': 'Nicht erschienen'
        }
        return status_map.get(status, status)


class RegistrationFormPDFExporter(PDFExporter):
    """Export BMG-compliant registration forms as PDF"""

    def generate_registration_form(self, form):
        """Generate BMG-compliant registration form PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=25*mm
        )

        elements = []

        # Header
        self._add_header(elements)

        # Title
        title = Paragraph("Meldeschein nach BMG", self.styles['SectionTitle'])
        elements.append(title)
        elements.append(Spacer(1, 3*mm))

        subtitle = Paragraph(
            "Beherbergungsstättenverordnung (BestV) §§ 5, 6",
            self.styles['CompanyInfo']
        )
        elements.append(subtitle)
        elements.append(Spacer(1, 5*mm))

        # Guest information
        guest = form.guest

        guest_data = [
            ['Gast-ID:', guest.guest_id or '—'],
            ['Nachname:', guest.last_name],
            ['Vorname:', guest.first_name],
            ['Anrede:', guest.salutation or '—'],
            ['Geburtsdatum:', self._format_date(guest.birth_date) if hasattr(guest, 'birth_date') and guest.birth_date else '—'],
            ['', ''],
        ]

        # Address information
        guest_data.extend([
            ['Anschrift:', ''],
            ['Straße:', guest.street or '—'],
            ['PLZ / Ort:', f"{guest.postal_code or '—'} {guest.city or '—'}"],
            ['Land:', guest.country or 'Deutschland'],
            ['', ''],
        ])

        # Contact information
        guest_data.extend([
            ['Kontakt:', ''],
            ['E-Mail:', guest.email or '—'],
            ['Telefon:', guest.phone_number or '—'],
            ['', ''],
        ])

        # Stay information
        guest_data.extend([
            ['Aufenthalt:', ''],
            ['Anreisedatum:', self._format_date(form.arrival_date) if form.arrival_date else '—'],
            ['Abreisedatum:', self._format_date(form.departure_date) if form.departure_date else '—'],
            ['Reisezweck:', self._get_travel_purpose(form.travel_purpose)],
            ['', ''],
        ])

        # Room and payment
        guest_data.extend([
            ['Zimmer & Zahlung:', ''],
            ['Zimmernummer:', form.room_number or '—'],
            ['Zimmerpreis/Nacht:', self._format_currency(form.room_price_per_night)],
            ['Zahlungsweise:', self._get_payment_method(form.payment_method)],
            ['Frühstück inkl.:', 'Ja' if form.breakfast_included else 'Nein'],
        ])

        if form.breakfast_included and form.breakfast_price:
            guest_data.append(['Frühstückspreis:', self._format_currency(form.breakfast_price)])

        # Create table
        table = Table(guest_data, colWidths=[60*mm, 110*mm])
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONT', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), self.COLOR_SECONDARY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

        # GDPR consent
        if guest.gdpr_consent:
            elements.append(Spacer(1, 10*mm))
            gdpr_text = f"""
            <para fontSize="9" textColor="#64748b">
            <b>Datenschutz:</b> Der Gast hat der Verarbeitung seiner personenbezogenen Daten
            gemäß Art. 6 Abs. 1 lit. a DSGVO am {self._format_date(guest.gdpr_consent_date)} zugestimmt.
            </para>
            """
            elements.append(Paragraph(gdpr_text, self.styles['Normal']))

        # Legal notice
        elements.append(Spacer(1, 10*mm))
        legal_notice = """
        <para fontSize="8" textColor="#64748b" align="justify">
        <b>Rechtliche Hinweise:</b> Dieser Meldeschein wird gemäß § 5 der Beherbergungsstättenverordnung (BestV)
        erstellt und für die gesetzlich vorgeschriebene Dauer aufbewahrt. Die Angaben sind wahrheitsgemäß zu machen.
        Falsche Angaben können ordnungswidrig sein. Die erhobenen Daten werden ausschließlich für die
        melderechtliche Verpflichtung verwendet und nach Ablauf der Aufbewahrungsfrist gelöscht.
        </para>
        """
        elements.append(Paragraph(legal_notice, self.styles['Normal']))

        # Signature section
        elements.append(Spacer(1, 15*mm))

        sig_data = [
            ['_' * 50, '_' * 50],
            ['Ort, Datum', 'Unterschrift Gast'],
        ]

        sig_table = Table(sig_data, colWidths=[85*mm, 85*mm])
        sig_table.setStyle(TableStyle([
            ('FONT', (0, 1), (-1, 1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, 1), 9),
            ('TEXTCOLOR', (0, 1), (-1, 1), self.COLOR_SECONDARY),
            ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(sig_table)

        # Build PDF
        doc.build(elements, onFirstPage=self._add_footer, onLaterPages=self._add_footer)

        buffer.seek(0)
        return buffer

    def _get_travel_purpose(self, purpose):
        """Convert travel purpose code to German text"""
        purpose_map = {
            'private': 'Privat',
            'business': 'Geschäftlich',
            'vacation': 'Urlaub',
            'other': 'Sonstiges'
        }
        return purpose_map.get(purpose, purpose)

    def _get_payment_method(self, method):
        """Convert payment method code to German text"""
        method_map = {
            'cash': 'Bargeld',
            'ec': 'EC-Karte',
            'credit_card': 'Kreditkarte',
            'invoice': 'Rechnung',
            'other': 'Sonstiges'
        }
        return method_map.get(method, method)

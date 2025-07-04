import 'guest.dart';
import 'table.dart'; // Assuming TableModel is in table.dart

class Reservation {
  final String id;
  final String guestId; // For sending to backend
  final Guest? guestDetails; // Read-only from backend
  final String? tableId; // For sending to backend
  final TableModel? tableDetails; // Read-only from backend
  final DateTime reservationTime;
  final int durationMinutes;
  final int numberOfGuests;
  final String status;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Reservation({
    required this.id,
    required this.guestId,
    this.guestDetails,
    this.tableId,
    this.tableDetails,
    required this.reservationTime,
    required this.durationMinutes,
    required this.numberOfGuests,
    required this.status,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) {
    return Reservation(
      id: json['id'] as String,
      guestId: json['guest'] as String, // Assuming 'guest' is the ID
      guestDetails: json['guest_details'] != null
          ? Guest.fromJson(json['guest_details'] as Map<String, dynamic>)
          : null,
      tableId: json['table'] as String?, // Assuming 'table' is the ID
      tableDetails: json['table_details'] != null
          ? TableModel.fromJson(json['table_details'] as Map<String, dynamic>)
          : null,
      reservationTime: DateTime.parse(json['reservation_time'] as String),
      durationMinutes: json['duration_minutes'] as int,
      numberOfGuests: json['number_of_guests'] as int,
      status: json['status'] as String,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'guest': guestId,
      'table': tableId,
      'reservation_time': reservationTime.toIso8601String(),
      'duration_minutes': durationMinutes,
      'number_of_guests': numberOfGuests,
      'status': status,
      'notes': notes,
    };
  }
}

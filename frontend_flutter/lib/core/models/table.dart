class TableModel { // Renamed to avoid conflict with Flutter's Table widget
  final String id;
  final String areaId; // Assuming area is sent as ID from backend for POST/PUT
  final String? areaName; // Read-only from backend
  final String tableNumber;
  final int capacity;
  final String status;
  final bool isReservable;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  TableModel({
    required this.id,
    required this.areaId,
    this.areaName,
    required this.tableNumber,
    required this.capacity,
    required this.status,
    required this.isReservable,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: json['id'] as String,
      areaId: json['area'] as String, // Expecting area ID
      areaName: json['area_name'] as String?,
      tableNumber: json['table_number'] as String,
      capacity: json['capacity'] as int,
      status: json['status'] as String,
      isReservable: json['is_reservable'] as bool,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'area': areaId,
      'table_number': tableNumber,
      'capacity': capacity,
      'status': status,
      'is_reservable': isReservable,
      'notes': notes,
    };
  }
}

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/area.dart';
import '../models/table.dart';
import '../models/guest.dart';
import '../models/reservation.dart';

class ApiService {
  // TODO: Basis-URL aus einer Konfigurationsdatei oder Umgebungsvariable laden
  // Für lokale Entwicklung mit Django dev server:
  // Android Emulator: 'http://10.0.2.2:8000/api/v1'
  // iOS Simulator oder physisches Gerät im selben Netzwerk: 'http://<DEINE_LOKALE_IP_ADDRESSE>:8000/api/v1'
  // Web: 'http://localhost:8000/api/v1' (wenn Django auf localhost:8000 läuft)
  final String _baseUrl = 'http://10.0.2.2:8000/api/v1'; // Beispiel für Android Emulator

  Future<Map<String, String>> _getHeaders() async {
    // TODO: Später Authentifizierungs-Token hinzufügen, falls erforderlich
    // String? token = await _getToken();
    return {
      'Content-Type': 'application/json; charset=UTF-F',
      // if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Helper für GET-Anfragen
  Future<dynamic> _get(String endpoint) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/$endpoint'),
      headers: await _getHeaders(),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(utf8.decode(response.bodyBytes)); // UTF8 für Umlaute etc.
    } else {
      // TODO: Besseres Error-Handling
      print('API GET Error on $endpoint: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to load data from $endpoint. Status: ${response.statusCode}');
    }
  }

  // Helper für POST-Anfragen
  Future<dynamic> _post(String endpoint, Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/$endpoint'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isNotEmpty) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
      return null; // No content
    } else {
      print('API POST Error on $endpoint: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to post data to $endpoint. Status: ${response.statusCode}, Body: ${response.body}');
    }
  }

  // Helper für PUT-Anfragen
  Future<dynamic> _put(String endpoint, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('$_baseUrl/$endpoint'),
      headers: await _getHeaders(),
      body: jsonEncode(data),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(utf8.decode(response.bodyBytes));
    } else {
      print('API PUT Error on $endpoint: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to update data on $endpoint. Status: ${response.statusCode}, Body: ${response.body}');
    }
  }

  // Helper für DELETE-Anfragen
  Future<void> _delete(String endpoint) async {
    final response = await http.delete(
      Uri.parse('$_baseUrl/$endpoint'),
      headers: await _getHeaders(),
    );
    if (response.statusCode != 204 && response.statusCode != 200) { // 204 No Content
      print('API DELETE Error on $endpoint: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to delete data on $endpoint. Status: ${response.statusCode}');
    }
  }

  // --- Area Endpoints ---
  Future<List<Area>> getAreas() async {
    final data = await _get('areas/') as List;
    return data.map((item) => Area.fromJson(item)).toList();
  }

  Future<Area> createArea(Area area) async {
    // ID wird vom Backend generiert, daher nicht im toJson für Create
    final Map<String, dynamic> areaData = {'name': area.name, 'description': area.description, 'is_active': area.isActive};
    final data = await _post('areas/', areaData);
    return Area.fromJson(data);
  }

  Future<Area> updateArea(String id, Area area) async {
    final data = await _put('areas/$id/', area.toJson());
    return Area.fromJson(data);
  }

  Future<void> deleteArea(String id) async {
    await _delete('areas/$id/');
  }

  // --- Table Endpoints ---
  Future<List<TableModel>> getTables({String? areaId}) async {
    String endpoint = 'tables/';
    if (areaId != null) {
      endpoint += '?area_id=$areaId';
    }
    final data = await _get(endpoint) as List;
    return data.map((item) => TableModel.fromJson(item)).toList();
  }

  Future<TableModel> createTable(TableModel table) async {
    // ID wird vom Backend generiert
    final Map<String, dynamic> tableData = {
        'area': table.areaId,
        'table_number': table.tableNumber,
        'capacity': table.capacity,
        'status': table.status,
        'is_reservable': table.isReservable,
        'notes': table.notes,
    };
    final data = await _post('tables/', tableData);
    return TableModel.fromJson(data);
  }

  Future<TableModel> updateTable(String id, TableModel table) async {
    final data = await _put('tables/$id/', table.toJson());
    return TableModel.fromJson(data);
  }

  Future<void> deleteTable(String id) async {
    await _delete('tables/$id/');
  }

  // --- Guest Endpoints ---
  Future<List<Guest>> getGuests() async {
    final data = await _get('guests/') as List;
    return data.map((item) => Guest.fromJson(item)).toList();
  }
   Future<Guest> createGuest(Guest guest) async {
    final data = await _post('guests/', guest.toJson());
    return Guest.fromJson(data);
  }

  Future<Guest> updateGuest(String id, Guest guest) async {
    final data = await _put('guests/$id/', guest.toJson());
    return Guest.fromJson(data);
  }

  Future<void> deleteGuest(String id) async {
    await _delete('guests/$id/');
  }

  // --- Reservation Endpoints ---
  Future<List<Reservation>> getReservations({String? date, String? guestId, String? tableId, String? status}) async {
    String endpoint = 'reservations/?';
    if (date != null) endpoint += 'date=$date&';
    if (guestId != null) endpoint += 'guest_id=$guestId&';
    if (tableId != null) endpoint += 'table_id=$tableId&';
    if (status != null) endpoint += 'status=$status&';

    final data = await _get(endpoint) as List;
    return data.map((item) => Reservation.fromJson(item)).toList();
  }

  Future<Reservation> createReservation(Reservation reservation) async {
    final data = await _post('reservations/', reservation.toJson());
    return Reservation.fromJson(data);
  }

  Future<Reservation> updateReservation(String id, Reservation reservation) async {
    final data = await _put('reservations/$id/', reservation.toJson());
    return Reservation.fromJson(data);
  }

  Future<void> deleteReservation(String id) async {
    await _delete('reservations/$id/');
  }

  Future<Reservation> confirmReservation(String id) async {
    final data = await _post('reservations/$id/confirm/', {});
    return Reservation.fromJson(data); // Backend sollte die aktualisierte Reservierung zurückgeben
  }

  Future<Reservation> cancelReservation(String id) async {
    final data = await _post('reservations/$id/cancel/', {});
    return Reservation.fromJson(data); // Backend sollte die aktualisierte Reservierung zurückgeben
  }

  // TODO: checkAvailability
}

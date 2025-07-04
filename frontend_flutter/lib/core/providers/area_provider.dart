import 'package:flutter/material.dart';
import '../models/area.dart';
import '../services/api_service.dart';

class AreaProvider with ChangeNotifier {
  final ApiService _apiService;

  AreaProvider(this._apiService);

  List<Area> _areas = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Area> get areas => _areas;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchAreas() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _areas = await _apiService.getAreas();
    } catch (e) {
      _errorMessage = e.toString();
      print("Error fetching areas: $_errorMessage");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addArea(String name, String? description) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Erstelle ein temporäres Area-Objekt für den POST-Request.
      // Die ID wird vom Backend generiert und ist hier nicht relevant.
      // createdAt und updatedAt werden ebenfalls vom Backend gesetzt.
      Area newArea = Area(
        id: '', // Wird vom Backend ignoriert/ersetzt
        name: name,
        description: description,
        isActive: true, // Standardmäßig aktiv
        createdAt: DateTime.now(), // Platzhalter
        updatedAt: DateTime.now() // Platzhalter
      );
      final createdArea = await _apiService.createArea(newArea);
      _areas.add(createdArea); // Füge die vom Backend erstellte Area hinzu
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateArea(Area area) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updatedArea = await _apiService.updateArea(area.id, area);
      final index = _areas.indexWhere((a) => a.id == area.id);
      if (index != -1) {
        _areas[index] = updatedArea;
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteArea(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.deleteArea(id);
      _areas.removeWhere((area) => area.id == id);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

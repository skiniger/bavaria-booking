import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/services/api_service.dart';
import 'core/providers/area_provider.dart';
// Import anderer Provider hier (TableProvider, GuestProvider, ReservationProvider)

// Erstellen der Verzeichnisstruktur, falls nicht vorhanden (für den Fall, dass es ein Problem gab)
// Normalerweise nicht nötig, da Flutter-Struktur existieren sollte.
// Dies ist nur eine Vorsichtsmaßnahme für die Sandbox-Umgebung.
// import 'dart:io';
// void _createDirs() {
//   Directory('lib/core/models').createSync(recursive: true);
//   Directory('lib/core/services').createSync(recursive: true);
//   Directory('lib/core/providers').createSync(recursive: true);
//   Directory('lib/features/restaurant_management/screens').createSync(recursive: true);
//   Directory('lib/features/restaurant_management/widgets').createSync(recursive: true);
// }


// Stellen Sie sicher, dass die Datei existiert, bevor sie importiert wird.
// In einer realen Umgebung wäre dies nicht nötig.
import 'features/restaurant_management/screens/area_list_screen.dart';

void main() {
  // _createDirs(); // Nur für Sandbox-Sicherstellung
  final ApiService apiService = ApiService();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AreaProvider(apiService)),
        // Weitere Provider hier hinzufügen
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gaststätten & Pension Verwaltung',
      theme: ThemeData(
        primarySwatch: Colors.blueGrey,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal).copyWith(secondary: Colors.amber),
        useMaterial3: true,
      ),
      home: const AreaListScreen(),
      debugShowCheckedModeBanner: false, // Banner entfernen
    );
  }
}

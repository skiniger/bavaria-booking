import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/providers/area_provider.dart';
import '../../../core/models/area.dart';
// import 'table_management_screen.dart'; // Für die Navigation zu Tischen eines Bereichs

class AreaListScreen extends StatefulWidget {
  const AreaListScreen({Key? key}) : super(key: key);

  @override
  State<AreaListScreen> createState() => _AreaListScreenState();
}

class _AreaListScreenState extends State<AreaListScreen> {
  @override
  void initState() {
    super.initState();
    // Daten initial laden, wenn der Screen zum ersten Mal gebaut wird.
    // `listen: false` ist wichtig in initState, um nicht auf Änderungen zu hören, bevor der Build abgeschlossen ist.
    Future.microtask(() => Provider.of<AreaProvider>(context, listen: false).fetchAreas());
  }

  void _showAddAreaDialog({Area? areaToEdit}) {
    final _nameController = TextEditingController(text: areaToEdit?.name);
    final _descriptionController = TextEditingController(text: areaToEdit?.description);
    final _formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(areaToEdit == null ? 'Bereich hinzufügen' : 'Bereich bearbeiten'),
        content: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name des Bereichs'),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Bitte einen Namen eingeben.';
                  }
                  return null;
                },
              ),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(labelText: 'Beschreibung (optional)'),
                maxLines: 2,
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            child: const Text('Abbrechen'),
            onPressed: () {
              Navigator.of(ctx).pop();
            },
          ),
          ElevatedButton(
            child: Text(areaToEdit == null ? 'Hinzufügen' : 'Speichern'),
            onPressed: () async {
              if (_formKey.currentState!.validate()) {
                final areaProvider = Provider.of<AreaProvider>(context, listen: false);
                bool success;
                if (areaToEdit == null) {
                  success = await areaProvider.addArea(
                    _nameController.text,
                    _descriptionController.text,
                  );
                } else {
                  Area updatedArea = Area(
                    id: areaToEdit.id,
                    name: _nameController.text,
                    description: _descriptionController.text,
                    isActive: areaToEdit.isActive, // isActive wird hier nicht geändert
                    createdAt: areaToEdit.createdAt,
                    updatedAt: DateTime.now() // Wird vom Backend gesetzt, aber für das Objekt hier
                  );
                  success = await areaProvider.updateArea(updatedArea);
                }

                if (success) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Bereich ${areaToEdit == null ? "hinzugefügt" : "aktualisiert"}')),
                  );
                } else {
                   ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Fehler: ${areaProvider.errorMessage ?? "Unbekannter Fehler"}')),
                  );
                }
              }
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Consumer widget reagiert auf Änderungen im AreaProvider
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurantbereiche verwalten'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddAreaDialog(),
          ),
        ],
      ),
      body: Consumer<AreaProvider>(
        builder: (context, areaProvider, child) {
          if (areaProvider.isLoading && areaProvider.areas.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (areaProvider.errorMessage != null && areaProvider.areas.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Fehler beim Laden: ${areaProvider.errorMessage}'),
                  ElevatedButton(
                      onPressed: () => areaProvider.fetchAreas(),
                      child: const Text("Erneut versuchen"))
                ],
              ),
            );
          }

          if (areaProvider.areas.isEmpty) {
            return const Center(child: Text('Keine Bereiche gefunden. Fügen Sie einen neuen Bereich hinzu.'));
          }

          return RefreshIndicator(
            onRefresh: () => areaProvider.fetchAreas(),
            child: ListView.builder(
              itemCount: areaProvider.areas.length,
              itemBuilder: (ctx, i) {
                final area = areaProvider.areas[i];
                return ListTile(
                  title: Text(area.name),
                  subtitle: Text(area.description ?? 'Keine Beschreibung'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => _showAddAreaDialog(areaToEdit: area),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () async {
                          // Bestätigungsdialog anzeigen
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (c) => AlertDialog(
                              title: const Text('Löschen bestätigen'),
                              content: Text('Möchten Sie den Bereich "${area.name}" wirklich löschen?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.of(c).pop(false), child: const Text('Abbrechen')),
                                TextButton(onPressed: () => Navigator.of(c).pop(true), child: const Text('Löschen', style: TextStyle(color: Colors.red))),
                              ],
                            )
                          );
                          if (confirm == true) {
                            final success = await areaProvider.deleteArea(area.id);
                             ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(success ? 'Bereich gelöscht' : 'Fehler: ${areaProvider.errorMessage}')),
                            );
                          }
                        },
                      ),
                      // TODO: Navigations-Icon zu Tischen dieses Bereichs
                      // IconButton(
                      //   icon: const Icon(Icons.table_restaurant_outlined),
                      //   onPressed: () {
                      //     Navigator.of(context).push(
                      //       MaterialPageRoute(builder: (_) => TableManagementScreen(area: area))
                      //     );
                      //   },
                      // ),
                    ],
                  ),
                  onTap: () {
                    // Navigiere zur Detailansicht oder Tischverwaltung für diesen Bereich
                    // Navigator.of(context).push(
                    //   MaterialPageRoute(builder: (_) => TableManagementScreen(area: area))
                    // );
                     ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Tische für ${area.name} anzeigen (TODO)'))
                     );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

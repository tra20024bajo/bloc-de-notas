import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, 
  StyleSheet, Alert, Modal 
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const db = SQLite.openDatabase('notes.db');

export default function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
    });
    loadNotes();
  }, []);

  const loadNotes = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM notes ORDER BY created_at DESC;',
        [],
        (_, { rows: { _array } }) => setNotes(_array)
      );
    });
  };

  const saveNote = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (editingNote) {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE notes SET title = ?, content = ? WHERE id = ?;',
          [title, content, editingNote.id],
          () => {
            resetEditor();
            loadNotes();
            setIsEditorVisible(false);
          }
        );
      });
    } else {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO notes (title, content) VALUES (?, ?);',
          [title, content],
          () => {
            resetEditor();
            loadNotes();
            setIsEditorVisible(false);
          }
        );
      });
    }
  };

  const deleteNote = () => {
    if (!editingNote) return;
    
    Alert.alert('Eliminar', '¿Eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: () => {
          db.transaction(tx => {
            tx.executeSql('DELETE FROM notes WHERE id = ?;', [editingNote.id], () => {
              loadNotes();
              setIsEditorVisible(false);
              resetEditor();
            });
          });
        }
      }
    ]);
  };

  const exportNote = async (format) => {
    if (!editingNote && !title) {
      Alert.alert('Error', 'Guarda la nota primero');
      return;
    }

    try {
      const noteToExport = editingNote || { title, content };
      const extension = format === 'txt' ? 'txt' : 'docx';
      const fileUri = FileSystem.documentDirectory + `${noteToExport.title}.${extension}`;
      
      let fileContent = '';
      if (format === 'txt') {
        fileContent = `${noteToExport.title}\n\n${noteToExport.content}`;
      } else {
        // Para DOCX necesitarías una librería adicional, por ahora usamos formato enriquecido
        fileContent = `Título: ${noteToExport.title}\n\nContenido:\n${noteToExport.content}`;
      }
      
      await FileSystem.writeAsStringAsync(fileUri, fileContent);
      await Sharing.shareAsync(fileUri);
      setMenuVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar');
    }
  };

  const shareNote = async () => {
    if (!editingNote && !title) {
      Alert.alert('Error', 'Guarda la nota primero');
      return;
    }

    try {
      const noteToShare = editingNote || { title, content };
      const message = `${noteToShare.title}\n\n${noteToShare.content}`;
      
      const fileUri = FileSystem.documentDirectory + 'temp_note.txt';
      await FileSystem.writeAsStringAsync(fileUri, message);
      await Sharing.shareAsync(fileUri);
      setMenuVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir');
    }
  };

  const resetEditor = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
  };

  const newNote = () => {
    resetEditor();
    setIsEditorVisible(true);
  };

  const editNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNote(note);
    setIsEditorVisible(true);
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => editNote(item)}>
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteContent} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Notas</Text>
        <TouchableOpacity style={styles.addButton} onPress={newNote}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={item => item.id.toString()}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay notas</Text>
            <Text style={styles.emptySubtext}>Presiona + para crear una</Text>
          </View>
        }
      />

      <Modal visible={isEditorVisible} animationType="slide">
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setIsEditorVisible(false)}>
              <Text style={styles.backButton}>← Atrás</Text>
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => setMenuVisible(true)}
              >
                <Text style={styles.menuButtonText}>⋮</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNote}>
                <Text style={styles.saveButton}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Título"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Escribe tu nota..."
            placeholderTextColor="#666"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => exportNote('txt')}
            >
              <Text style={styles.menuItemText}>📄 Exportar como TXT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => exportNote('docx')}
            >
              <Text style={styles.menuItemText}>📝 Exportar como DOCX</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={shareNote}
            >
              <Text style={styles.menuItemText}>📤 Compartir</Text>
            </TouchableOpacity>
            
            {editingNote && (
              <TouchableOpacity 
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={deleteNote}
              >
                <Text style={styles.deleteMenuText}>🗑️ Eliminar nota</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.cancelMenuItem]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 50,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  addButton: { 
    backgroundColor: '#BB86FC', 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  addButtonText: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  list: { 
    flex: 1 
  },
  noteCard: { 
    padding: 18, 
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#BB86FC'
  },
  noteTitle: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    marginBottom: 6,
    color: '#FFFFFF'
  },
  noteContent: { 
    fontSize: 14, 
    color: '#B0B0B0',
    lineHeight: 20
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 16,
    color: '#888'
  },
  editor: { 
    flex: 1, 
    paddingTop: 50,
    backgroundColor: '#121212'
  },
  editorHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E'
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  backButton: { 
    color: '#BB86FC', 
    fontSize: 18,
    fontWeight: '600'
  },
  menuButton: {
    padding: 5
  },
  menuButtonText: {
    color: '#BB86FC',
    fontSize: 24,
    fontWeight: 'bold'
  },
  saveButton: { 
    color: '#BB86FC', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  titleInput: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
    color: '#FFFFFF',
    backgroundColor: '#121212'
  },
  contentInput: { 
    flex: 1, 
    padding: 15, 
    fontSize: 16,
    color: '#E0E0E0',
    backgroundColor: '#121212'
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  menuContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
    marginTop: 5
  },
  deleteMenuText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500'
  },
  cancelMenuItem: {
    borderBottomWidth: 0,
    marginTop: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 10
  }
});

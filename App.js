import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, 
  StyleSheet, ScrollView, Alert, Modal 
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

  const deleteNote = (id) => {
    Alert.alert('Eliminar', '¿Eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: () => {
          db.transaction(tx => {
            tx.executeSql('DELETE FROM notes WHERE id = ?;', [id], loadNotes);
          });
        }
      }
    ]);
  };

  const exportNote = async (note) => {
    try {
      const fileUri = FileSystem.documentDirectory + `${note.title}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, `Título: ${note.title}\n\n${note.content}`);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar');
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
      />

      <Modal visible={isEditorVisible} animationType="slide">
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setIsEditorVisible(false)}>
              <Text style={styles.backButton}>← Atrás</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveNote}>
              <Text style={styles.saveButton}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Título"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Escribe tu nota..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 50,
    backgroundColor: '#f0f0f0' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  addButton: { 
    backgroundColor: '#007AFF', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  list: { flex: 1 },
  noteCard: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  noteTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  noteContent: { fontSize: 14, color: '#666' },
  editor: { flex: 1, paddingTop: 50 },
  editorHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backButton: { color: '#007AFF', fontSize: 16 },
  saveButton: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  titleInput: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  contentInput: { 
    flex: 1, 
    padding: 15, 
    fontSize: 16 
  }
});

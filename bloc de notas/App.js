import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Appbar, TextInput, Button, Card, RadioButton, List, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const webViewRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState('https://google.com');
  const [urlInput, setUrlInput] = useState('https://google.com');
  const [showUASelector, setShowUASelector] = useState(false);
  const [selectedUA, setSelectedUA] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isLoading, setIsLoading] = useState(false);

  // USER-AGENTS database (de tu extensión)aimport React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Modal,
  Button
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// Abrir base de datos
const db = SQLite.openDatabase('notes.db');

export default function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isNewNote, setIsNewNote] = useState(true);

  // Inicializar base de datos
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
    });
    loadNotes();
  }, []);

  const loadNotes = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM notes ORDER BY updated_at DESC;',
        [],
        (_, { rows: { _array } }) => setNotes(_array)
      );
    });
  };

  const searchNotes = (text) => {
    setSearchText(text);
    if (text === '') {
      loadNotes();
    } else {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC;',
          [`%${text}%`, `%${text}%`],
          (_, { rows: { _array } }) => setNotes(_array)
        );
      });
    }
  };

  const saveNote = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (isNewNote) {
      // Nueva nota
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO notes (title, content, updated_at) VALUES (?, ?, datetime("now"));',
          [title, content],
          (_, result) => {
            console.log('Nota guardada con ID:', result.insertId);
            resetEditor();
            loadNotes();
            setIsEditorVisible(false);
          }
        );
      });
    } else {
      // Actualizar nota existente
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE notes SET title = ?, content = ?, updated_at = datetime("now") WHERE id = ?;',
          [title, content, selectedNote.id],
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
    Alert.alert(
      'Eliminar nota',
      '¿Estás seguro de que quieres eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            db.transaction(tx => {
              tx.executeSql(
                'DELETE FROM notes WHERE id = ?;',
                [id],
                () => {
                  loadNotes();
                  if (selectedNote && selectedNote.id === id) {
                    resetEditor();
                    setIsEditorVisible(false);
                  }
                }
              );
            });
          }
        }
      ]
    );
  };

  const exportNote = async (note) => {
    try {
      const fileName = `${note.title.replace(/\s+/g, '_')}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, `Título: ${note.title}\n\n${note.content}`);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Compartir nota'
        });
      } else {
        Alert.alert('Info', 'La función de compartir no está disponible');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar la nota');
    }
  };

  const editNote = (note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setIsNewNote(false);
    setIsEditorVisible(true);
  };

  const newNote = () => {
    resetEditor();
    setIsNewNote(true);
    setIsEditorVisible(true);
  };

  const resetEditor = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderNoteItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.noteCard}
      onPress={() => editNote(item)}
      onLongPress={() => {
        Alert.alert(
          'Opciones',
          '¿Qué quieres hacer con esta nota?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Editar', onPress: () => editNote(item) },
            { text: 'Exportar', onPress: () => exportNote(item) },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteNote(item.id) }
          ]
        );
      }}
    >
      <Text style={styles.noteTitle} numberOfLines={1}>
        {item.title || 'Sin título'}
      </Text>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.content?.replace(/[^\w\s]/gi, '') || 'Sin contenido'}
      </Text>
      <Text style={styles.noteDate}>
        {formatDate(item.updated_at)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Notas</Text>
        <TouchableOpacity style={styles.newButton} onPress={newNote}>
          <Text style={styles.newButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE BÚSQUEDA */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar notas..."
        value={searchText}
        onChangeText={searchNotes}
      />

      {/* LISTA DE NOTAS */}
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No hay notas aún</Text>
          <Text style={styles.emptyStateSubtext}>Toca "+ Nueva" para crear tu primera nota</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.notesList}
        />
      )}

      {/* MODAL EDITOR */}
      <Modal
        visible={isEditorVisible}
        animationType="slide"
        onRequestClose={() => setIsEditorVisible(false)}
      >
        <View style={styles.editorContainer}>
          {/* HEADER EDITOR */}
          <View style={styles.editorHeader}>
            <TouchableOpacity 
              onPress={() => setIsEditorVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>
              {isNewNote ? 'Nueva Nota' : 'Editar Nota'}
            </Text>
            <TouchableOpacity onPress={saveNote} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>

          {/* FORMULARIO EDITOR */}
          <ScrollView style={styles.editorContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Título de la nota"
              value={title}
              onChangeText={setTitle}
              multiline={true}
            />
            
            <TextInput
              style={styles.contentInput}
              placeholder="Escribe tu nota aquí..."
              value={content}
              onChangeText={setContent}
              multiline={true}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* BOTONES ADICIONALES */}
          {!isNewNote && (
            <View style={styles.editorButtons}>
              <TouchableOpacity 
                style={styles.exportButton}
                onPress={() => exportNote(selectedNote)}
              >
                <Text style={styles.exportButtonText}>Exportar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteNote(selectedNote.id)}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  newButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: 'white',
    margin: 15,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesList: {
    flex: 1,
  },
  noteCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 50,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 5,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editorContent: {
    flex: 1,
    padding: 15,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  editorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  exportButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exportButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
  const userAgents = {
    desktop: [
      { 
        name: "Windows 10 - Chrome", 
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        resolution: "1920x1080"
      },
      { 
        name: "Windows 7/10 - IE 11", 
        value: "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko",
        resolution: "1366x768"
      },
      { 
        name: "macOS - Chrome", 
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        resolution: "1440x900"
      },
      { 
        name: "macOS - Safari", 
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
        resolution: "1440x900"
      },
      { 
        name: "Linux - Chrome", 
        value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        resolution: "1366x768"
      }
    ],
    mobile: [
      { 
        name: "Android Phone - Chrome", 
        value: "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        resolution: "412x915"
      },
      { 
        name: "Android Tablet", 
        value: "Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        resolution: "800x1280"
      },
      { 
        name: "iPhone - Safari", 
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        resolution: "390x844"
      },
      { 
        name: "iPad - Safari", 
        value: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        resolution: "834x1194"
      }
    ]
  };

  // IDIOMAS (de tu extensión)
  const languageProfiles = {
    "en-US": "English (US)",
    "es-ES": "Español (ES)", 
    "fr-FR": "Français (FR)",
    "de-DE": "Deutsch (DE)",
    "ja-JP": "日本語 (JP)",
    "pt-BR": "Português (BR)"
  };

  // Cargar configuración guardada
  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      const savedUA = await AsyncStorage.getItem('selectedUA');
      const savedLang = await AsyncStorage.getItem('selectedLanguage');
      if (savedUA) setSelectedUA(savedUA);
      if (savedLang) setSelectedLanguage(savedLang);
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  // Navegar a URL
  const navigate = () => {
    let url = urlInput.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    setCurrentUrl(url);
    setUrlInput(url);
  };

  // Aplicar User-Agent
  const applyUserAgent = async (ua) => {
    setSelectedUA(ua);
    await AsyncStorage.setItem('selectedUA', ua);
    setShowUASelector(false);
    
    // Recargar página con nuevo User-Agent
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Aplicar Idioma
  const applyLanguage = async (lang) => {
    setSelectedLanguage(lang);
    await AsyncStorage.setItem('selectedLanguage', lang);
    
    // Recargar página con nuevo idioma
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Reset configuración
  const resetSettings = async () => {
    setSelectedUA('');
    setSelectedLanguage('en-US');
    await AsyncStorage.multiRemove(['selectedUA', 'selectedLanguage']);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        
        {/* HEADER CON BUSCADOR */}
        <Appbar.Header>
          <Appbar.Action 
            icon="menu" 
            onPress={() => setShowUASelector(true)} 
          />
          
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={navigate}
            placeholder="Ingresa URL o busca..."
            mode="outlined"
            dense
          />
          
          <Appbar.Action 
            icon="magnify" 
            onPress={navigate} 
          />
        </Appbar.Header>

        {/* BARRA DE NAVEGACIÓN */}
        <View style={styles.navBar}>
          <Button 
            mode="text" 
            icon="arrow-left" 
            onPress={() => webViewRef.current?.goBack()}
          >
            Atrás
          </Button>
          
          <Button 
            mode="text" 
            icon="arrow-right" 
            onPress={() => webViewRef.current?.goForward()}
          >
            Adelante
          </Button>
          
          <Button 
            mode="text" 
            icon="reload" 
            onPress={() => webViewRef.current?.reload()}
          >
            Recargar
          </Button>
          
          <Button 
            mode="text" 
            icon="home" 
            onPress={() => {
              setUrlInput('https://google.com');
              setCurrentUrl('https://google.com');
            }}
          >
            Inicio
          </Button>
        </View>

        {/* INDICADOR DE CONFIGURACIÓN ACTUAL */}
        <View style={styles.configBar}>
          <Text style={styles.configText}>
            {selectedUA ? 'User-Agent: ' + userAgents.desktop.concat(userAgents.mobile)
              .find(ua => ua.value === selectedUA)?.name : 'User-Agent: Predeterminado'}
          </Text>
          <Text style={styles.configText}>
            Idioma: {languageProfiles[selectedLanguage]}
          </Text>
        </View>

        {/* NAVEGADOR WEBVIEW */}
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          userAgent={selectedUA}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
          injectedJavaScript={`
            // Inyectar configuración de idioma
            Object.defineProperty(navigator, 'language', {
              get: function() { return '${selectedLanguage}'; }
            });
            Object.defineProperty(navigator, 'languages', {
              get: function() { return ['${selectedLanguage}', '${selectedLanguage.split('-')[0]}', 'en']; }
            });
            true;
          `}
        />

        {/* MODAL SELECTOR USER-AGENT */}
        <Modal
          visible={showUASelector}
          animationType="slide"
          onRequestClose={() => setShowUASelector(false)}
        >
          <View style={styles.modalContainer}>
            <Appbar.Header>
              <Appbar.BackAction onPress={() => setShowUASelector(false)} />
              <Appbar.Content title="Configurar User-Agent" />
              <Appbar.Action icon="refresh" onPress={resetSettings} />
            </Appbar.Header>

            <ScrollView style={styles.modalContent}>
              
              {/* SELECTOR DE IDIOMA */}
              <Card style={styles.sectionCard}>
                <Card.Title title="Idioma y Región" />
                <Card.Content>
                  {Object.entries(languageProfiles).map(([code, name]) => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.languageItem,
                        selectedLanguage === code && styles.selectedItem
                      ]}
                      onPress={() => applyLanguage(code)}
                    >
                      <RadioButton
                        value={code}
                        status={selectedLanguage === code ? 'checked' : 'unchecked'}
                        onPress={() => applyLanguage(code)}
                      />
                      <Text style={styles.languageText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </Card.Content>
              </Card>

              {/* USER-AGENTS ESCRITORIO */}
              <Card style={styles.sectionCard}>
                <Card.Title title="Modo Escritorio" />
                <Card.Content>
                  {userAgents.desktop.map((ua, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.uaItem,
                        selectedUA === ua.value && styles.selectedItem
                      ]}
                      onPress={() => applyUserAgent(ua.value)}
                    >
                      <RadioButton
                        value={ua.value}
                        status={selectedUA === ua.value ? 'checked' : 'unchecked'}
                        onPress={() => applyUserAgent(ua.value)}
                      />
                      <View style={styles.uaInfo}>
                        <Text style={styles.uaName}>{ua.name}</Text>
                        <Text style={styles.uaResolution}>{ua.resolution}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Card.Content>
              </Card>

              {/* USER-AGENTS MÓVIL */}
              <Card style={styles.sectionCard}>
                <Card.Title title="Modo Móvil" />
                <Card.Content>
                  {userAgents.mobile.map((ua, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.uaItem,
                        selectedUA === ua.value && styles.selectedItem
                      ]}
                      onPress={() => applyUserAgent(ua.value)}
                    >
                      <RadioButton
                        value={ua.value}
                        status={selectedUA === ua.value ? 'checked' : 'unchecked'}
                        onPress={() => applyUserAgent(ua.value)}
                      />
                      <View style={styles.uaInfo}>
                        <Text style={styles.uaName}>{ua.name}</Text>
                        <Text style={styles.uaResolution}>{ua.resolution}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Card.Content>
              </Card>

              {/* BOTÓN RESET */}
              <Button 
                mode="outlined" 
                style={styles.resetButton}
                onPress={resetSettings}
                icon="refresh"
              >
                Restablecer Configuración
              </Button>

            </ScrollView>
          </View>
        </Modal>

      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  urlInput: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 5,
    justifyContent: 'space-around',
  },
  configBar: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  configText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '500',
  },
  webview: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 10,
  },
  sectionCard: {
    marginBottom: 15,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  uaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
  languageText: {
    fontSize: 16,
    marginLeft: 8,
  },
  uaInfo: {
    marginLeft: 8,
    flex: 1,
  },
  uaName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  uaResolution: {
    fontSize: 12,
    color: '#666',
  },
  resetButton: {
    margin: 15,
    marginTop: 5,
  },
});
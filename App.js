// Desenvolvido por Vinicius Augusto Ramos Bastos 
// Em conjunto com 
// Pedro Henrique Lopes Martins

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  Image,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons"; // ícones modernos

// =========================
// 🔹 APP PRINCIPAL
// =========================
export default function App() {
  const [tela, setTela] = useState("album");
  const [fotos, setFotos] = useState([]);
  const [editando, setEditando] = useState(null);

  const BASE_URL = "http://10.110.12.15:3000/fotos"; // altere para o IP local do seu JSON Server

  async function carregarFotos() {
    try {
      const res = await fetch(BASE_URL);
      const dados = await res.json();
      setFotos(dados.reverse());
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as fotos.");
    }
  }

  useEffect(() => {
    carregarFotos();
  }, []);

  async function deletarFoto(item) {
    try {
      const info = await FileSystem.getInfoAsync(item.uri);
      if (info.exists) await FileSystem.deleteAsync(item.uri);
      await fetch(`${BASE_URL}/${item.id}`, { method: "DELETE" });
      carregarFotos();
    } catch {
      Alert.alert("Erro", "Não foi possível excluir a foto.");
    }
  }

  async function salvarEdicao() {
    await fetch(`${BASE_URL}/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando),
    });
    setEditando(null);
    carregarFotos();
  }

  if (tela === "camera") {
    return (
      <CameraScreen
        onVoltar={() => setTela("album")}
        onFotoSalva={() => {
          setTela("album");
          carregarFotos();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.tituloApp}>📸 App Álbum</Text>

      <TouchableOpacity style={styles.botaoNovo} onPress={() => setTela("camera")}>
        <Ionicons name="camera-outline" size={20} color="#fff" />
        <Text style={styles.botaoTexto}>Nova Foto</Text>
      </TouchableOpacity>

      <FlatList
        data={fotos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) =>
          editando && editando.id === item.id ? (
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={editando.titulo_foto}
                onChangeText={(t) => setEditando({ ...editando, titulo_foto: t })}
              />
              <TextInput
                style={styles.input}
                value={editando.descricao_foto}
                onChangeText={(d) =>
                  setEditando({ ...editando, descricao_foto: d })
                }
              />
              <Button title="Salvar" onPress={salvarEdicao} />
              <Button title="Cancelar" onPress={() => setEditando(null)} />
            </View>
          ) : (
            <View style={styles.card}>
              <Image source={{ uri: item.uri }} style={styles.image} />
              <Text style={styles.tituloFoto}>{item.titulo_foto}</Text>
              <Text>{item.descricao_foto}</Text>
              <View style={styles.botoesLinha}>
                <TouchableOpacity
                  style={styles.btnEditar}
                  onPress={() => setEditando(item)}
                >
                  <Ionicons name="pencil-outline" size={18} color="#fff" />
                  <Text style={styles.btnTexto}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnExcluir}
                  onPress={() => deletarFoto(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.btnTexto}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

// =========================
// 🔹 TELA DE CÂMERA MODERNA
// =========================
function CameraScreen({ onVoltar, onFotoSalva }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [facing, setFacing] = useState("back");
  const cameraRef = useRef(null);

  const BASE_URL = "http://10.110.12.15:3000/fotos";

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Permissão da câmera necessária.</Text>
        <Button title="Conceder permissão" onPress={requestPermission} />
        <Button title="Voltar" onPress={onVoltar} />
      </SafeAreaView>
    );
  }

  async function tirarFoto() {
    if (!cameraRef.current) return;
    const foto = await cameraRef.current.takePictureAsync();
    setFotoUri(foto.uri);
  }

  async function salvarFoto() {
    try {
      const dir = FileSystem.documentDirectory + "images/";
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists)
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const nome = `photo_${Date.now()}.jpg`;
      const destino = dir + nome;
      await FileSystem.copyAsync({ from: fotoUri, to: destino });

      const novo = {
        titulo_foto: titulo || "Sem título",
        descricao_foto: descricao || "",
        data_foto: new Date().toISOString(),
        uri: destino,
      };

      await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });

      Alert.alert("Sucesso", "Foto salva!");
      onFotoSalva();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar a foto.");
    }
  }

  const inverterCamera = () => setFacing(facing === "back" ? "front" : "back");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {fotoUri ? (
        <View style={{ flex: 1, padding: 10, backgroundColor: "#fff" }}>
          <Image source={{ uri: fotoUri }} style={styles.preview} />
          <TextInput
            placeholder="Título da foto"
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
          />
          <TextInput
            placeholder="Descrição"
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
          />
          <TouchableOpacity style={styles.botaoSalvar} onPress={salvarFoto}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.btnTexto}>Salvar</Text>
          </TouchableOpacity>

          <Button title="Tirar outra" onPress={() => setFotoUri(null)} />
          <Button title="Voltar ao álbum" onPress={onVoltar} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <CameraView
            style={styles.camera}
            ref={cameraRef}
            facing={facing}
            autofocus="on"
          />

          {/* Barra de ação flutuante */}
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.actionButton} onPress={inverterCamera}>
              <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterButton} onPress={tirarFoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onVoltar}>
              <Ionicons name="arrow-undo-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// =========================
// 🎨 ESTILOS MODERNOS
// =========================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  tituloApp: { fontSize: 24, fontWeight: "bold", marginBottom: 10, color: "#333" },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    elevation: 2,
  },
  image: { width: "100%", height: 200, borderRadius: 8, marginBottom: 6 },
  tituloFoto: { fontWeight: "bold", fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  botoesLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  btnEditar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 6,
  },
  btnExcluir: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    padding: 8,
    borderRadius: 6,
  },
  btnTexto: { color: "#fff", marginLeft: 4 },
  botaoNovo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28A745",
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  botaoTexto: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  camera: { flex: 1 },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    padding: 14,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 25,
  },
  preview: { width: "100%", height: 320, marginVertical: 10, borderRadius: 10 },
  botaoSalvar: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
});

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://lingjing.preview.aliyun-zeabur.cn/api';
const HISTORY_KEY = 'lingjing_image_history';

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [height, setHeight] = useState('170');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('size');
  const [history, setHistory] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [prompt, setPrompt] = useState('');  // 新增 prompt 状态
  const [modelImage, setModelImage] = useState(null);   // 模特图（虚拟试穿）
  const [garmentImage, setGarmentImage] = useState(null); // 服装图（虚拟试穿）

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const saveToHistory = (url, type) => {
    if (!url) return;
    const newItem = {
      id: Date.now(),
      url: url,
      type: type,
      timestamp: new Date().toLocaleString(),
    };
    const newHistory = [newItem, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    showToast(`${type} 已保存到历史记录`);
  };

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setSelectedImage(res.assets[0]);
        setResult(null);
      }
    });
  };

  const takePhoto = () => {
    ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setSelectedImage(res.assets[0]);
        setResult(null);
      }
    });
  };

  const convertToFile = async (imageAsset) => {
    const uri = imageAsset.uri;
    if (uri.startsWith('data:')) {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new File([blob], imageAsset.fileName || 'photo.jpg', { type: blob.type });
    }
    return {
      uri: uri,
      type: imageAsset.type || 'image/jpeg',
      name: imageAsset.fileName || 'photo.jpg',
    };
  };

  const recommendSize = async () => {
    if (!selectedImage) return showToast('请先选择一张照片');
    setLoading(true);
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    formData.append('image', file);
    formData.append('height', height);
    try {
      const res = await axios.post(`${API_URL}/size/recommend`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      setResult(res.data.data.output_data);
      showToast('尺码推荐完成');
    } catch (err) {
      showToast(err.response?.data?.detail || '请求失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!selectedImage) return showToast('请先选择一张参考图片');
    setLoading(true);
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    formData.append('reference_image', file);
    formData.append('prompt', prompt || '生成一张高质量的图片');
    formData.append('width', '512');
    formData.append('height', '512');
    try {
      const res = await axios.post(`${API_URL}/image/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const imgUrl = res.data.data.output_data.images[0].url;
      setResult(res.data.data.output_data);
      saveToHistory(imgUrl, '图片生成');
      showToast('图片生成成功');
    } catch (err) {
      showToast(err.response?.data?.detail || '生成失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!selectedImage) return showToast('请先选择一张图片');
    setLoading(true);
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    formData.append('image', file);
    formData.append('prompt', prompt || '生成动态视频');
    formData.append('duration', '5');
    formData.append('mode', 'std');
    try {
      const res = await axios.post(`${API_URL}/video/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const videoUrl = res.data.data.output_data.video_url;
      setResult(res.data.data.output_data);
      saveToHistory(videoUrl, '视频生成');
      showToast('视频生成成功');
    } catch (err) {
      showToast(err.response?.data?.detail || '生成失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateTryon = async () => {
    if (!modelImage) return showToast('请先选择模特图片');
    if (!garmentImage) return showToast('请先选择服装图片');
    setLoading(true);
    const formData = new FormData();
    const modelFile = await convertToFile(modelImage);
    const garmentFile = await convertToFile(garmentImage);
    formData.append('model_image', modelFile);
    formData.append('garment_image', garmentFile);
    try {
      const res = await axios.post(`${API_URL}/tryon/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const tryonUrl = res.data.data.output_data.video_url;
      setResult(res.data.data.output_data);
      saveToHistory(tryonUrl, '虚拟试穿');
      showToast('试穿视频生成成功');
    } catch (err) {
      showToast(err.response?.data?.detail || '试穿失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    switch (activeTab) {
      case 'size': recommendSize(); break;
      case 'image': generateImage(); break;
      case 'video': generateVideo(); break;
      case 'tryon': generateTryon(); break;
      default: break;
    }
  };

  const renderResult = () => {
    if (!result) return null;
    if (activeTab === 'size') {
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>📏 尺码推荐</Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeItem}>
              <Text style={styles.sizeLabel}>胸围</Text>
              <Text style={styles.sizeValue}>{result.bust} cm</Text>
            </View>
            <View style={styles.sizeItem}>
              <Text style={styles.sizeLabel}>腰围</Text>
              <Text style={styles.sizeValue}>{result.waist} cm</Text>
            </View>
            <View style={styles.sizeItem}>
              <Text style={styles.sizeLabel}>臀围</Text>
              <Text style={styles.sizeValue}>{result.hip} cm</Text>
            </View>
          </View>
          <Text style={styles.recommendSize}>推荐尺码: {result.recommended_size}</Text>
        </Card>
      );
    } else if (activeTab === 'image' && result && result.images) {
      const originalUrl = result.images[0].url;
      const proxyUrl = `${API_URL.replace('/api', '')}/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
      const copyToClipboard = () => {
        navigator.clipboard.writeText(originalUrl);
        showToast('URL已复制到剪贴板');
      };
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>✨ 生成图片</Text>
          <TouchableOpacity onPress={() => { setPreviewUrl(proxyUrl); setModalVisible(true); }}>
            <Image source={{ uri: proxyUrl }} style={styles.resultImage} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.urlRow}>
            <Text selectable style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">{originalUrl}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Icon name="copy-outline" size={20} color="#7c3aed" />
            </TouchableOpacity>
          </View>
        </Card>
      );
    } else if (activeTab === 'video' && result.video_url) {
      const videoUrl = result.video_url;
      const copyToClipboard = () => {
        navigator.clipboard.writeText(videoUrl);
        showToast('URL已复制到剪贴板');
      };
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>🎬 生成视频</Text>
          <View style={styles.urlRow}>
            <Text selectable style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">{videoUrl}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Icon name="copy-outline" size={20} color="#7c3aed" />
            </TouchableOpacity>
          </View>
        </Card>
      );
    } else if (activeTab === 'tryon' && result.video_url) {
      const tryonUrl = result.video_url;
      const copyToClipboard = () => {
        navigator.clipboard.writeText(tryonUrl);
        showToast('URL已复制到剪贴板');
      };
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>👗 试穿结果</Text>
          <View style={styles.urlRow}>
            <Text selectable style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">{tryonUrl}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Icon name="copy-outline" size={20} color="#7c3aed" />
            </TouchableOpacity>
          </View>
        </Card>
      );
    }
    return null;
  };

  const tabs = [
    { key: 'size', icon: 'body-outline', label: '尺码', color: '#7c3aed' },
    { key: 'image', icon: 'image-outline', label: '图片', color: '#10b981' },
    { key: 'video', icon: 'videocam-outline', label: '视频', color: '#f59e0b' },
    { key: 'tryon', icon: 'shirt-outline', label: '试穿', color: '#ef4444' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>灵境</Text>
          <Text style={styles.subtitle}>AI 创意平台</Text>
        </View>

        <View style={styles.tabContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}>
              <Icon name={tab.icon} size={24} color={activeTab === tab.key ? tab.color : '#888'} />
              <Text style={[styles.tabText, activeTab === tab.key && { color: tab.color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.imageCard}>
            <Text style={styles.cardTitle}>
              {activeTab === 'size' ? '📸 上传全身照' :
               activeTab === 'image' ? '🎨 上传参考图' :
               activeTab === 'video' ? '🎥 上传图片' : '👤 上传模特图'}
            </Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholder}>
                  <Icon name="cloud-upload-outline" size={48} color="#666" />
                  <Text style={styles.placeholderText}>点击上传图片</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                <Icon name="images-outline" size={20} color="#fff" />
                <Text style={styles.iconButtonText}>相册</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={takePhoto}>
                <Icon name="camera-outline" size={20} color="#fff" />
                <Text style={styles.iconButtonText}>拍照</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {activeTab === 'size' && (
            <Card style={styles.inputCard}>
              <Text style={styles.cardTitle}>📏 身高</Text>
              <View style={styles.heightRow}>
                <TextInput
                  style={styles.heightInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#888"
                />
                <Text style={styles.heightUnit}>cm</Text>
              </View>
            </Card>
          )}

          {/* 图片生成的 prompt 输入框 */}
          {activeTab === 'image' && (
            <Card style={styles.promptCard}>
              <Text style={styles.cardTitle}>💬 描述你想要的图片</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="例如：把衣服穿在模特身上，自然光线，4K高清..."
                placeholderTextColor="#888"
                multiline
              />
            </Card>
          )}

          {/* 视频生成的 prompt 输入框 */}
          {activeTab === 'video' && (
            <Card style={styles.promptCard}>
              <Text style={styles.cardTitle}>💬 描述你想要的视频</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="例如：衣服随风飘动，模特在T台上走秀..."
                placeholderTextColor="#888"
                multiline
              />
            </Card>
          )}

          {/* 虚拟试穿的 prompt 输入框 */}
          {activeTab === 'tryon' && (
            <Card style={styles.promptCard}>
              <Text style={styles.cardTitle}>💬 描述试穿效果（可选）</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="例如：自然贴合，光线柔和..."
                placeholderTextColor="#888"
                multiline
              />
            </Card>
          )}

          <TouchableOpacity onPress={handleGenerate} disabled={loading} style={styles.generateButton}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.generateText}>
                {activeTab === 'size' ? '开始尺码推荐' :
                 activeTab === 'image' ? '开始生成图片' :
                 activeTab === 'video' ? '开始生成视频' : '开始虚拟试穿'}
              </Text>
            )}
          </TouchableOpacity>

          {renderResult()}

          {history.length > 0 && (
            <Card style={styles.historyCard}>
              <Text style={styles.cardTitle}>📜 历史记录</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.type === '图片生成') {
                        setResult({ images: [{ url: item.url }] });
                        setActiveTab('image');
                      } else {
                        setResult({ video_url: item.url });
                        setActiveTab(item.type === '视频生成' ? 'video' : 'tryon');
                      }
                    }}
                    style={styles.historyItem}
                  >
                    <Image source={{ uri: item.url }} style={styles.historyImage} />
                    <Text style={styles.historyText}>{item.type}</Text>
                    <Text style={styles.historyTime}>{item.timestamp}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}
        </ScrollView>

        <Modal visible={modalVisible} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Icon name="close-outline" size={30} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: previewUrl }} style={styles.modalImage} resizeMode="contain" />
          </View>
        </Modal>

        {toastVisible && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingTop: Platform.OS === 'web' ? 30 : 50, paddingBottom: 20, alignItems: 'center' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 4 },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a2e', marginHorizontal: 20, marginVertical: 15, borderRadius: 40, paddingVertical: 8 },
  tab: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 30 },
  activeTab: { backgroundColor: 'rgba(124,58,237,0.2)' },
  tabText: { fontSize: 12, marginTop: 4, color: '#888', fontWeight: '500' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  imageCard: { alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16, alignSelf: 'flex-start' },
  imagePicker: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#aaa', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 16 },
  iconButton: { flexDirection: 'row', backgroundColor: '#3b3b5c', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, alignItems: 'center', gap: 8 },
  iconButtonText: { color: '#fff', fontSize: 14 },
  inputCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heightInput: { backgroundColor: '#2d2d44', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, width: 100, color: '#fff', fontSize: 16, textAlign: 'center' },
  heightUnit: { color: '#aaa', fontSize: 14 },
  promptCard: { padding: 20 },
  promptInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  generateButton: { backgroundColor: '#7c3aed', borderRadius: 40, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  generateText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultCard: { alignItems: 'center' },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  sizeItem: { alignItems: 'center' },
  sizeLabel: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  sizeValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  recommendSize: { fontSize: 18, color: '#7c3aed', fontWeight: '600', marginTop: 8 },
  resultImage: { width: width * 0.7, height: width * 0.7, borderRadius: 16, marginTop: 10 },
  linkText: { color: '#7c3aed', fontSize: 12, marginTop: 8, textDecorationLine: 'underline' },
  urlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, width: '100%', gap: 8 },
  copyButton: { padding: 8, backgroundColor: '#2d2d44', borderRadius: 8 },
  historyCard: { marginTop: 10 },
  historyItem: { marginRight: 15, alignItems: 'center', width: 100 },
  historyImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#2d2d44' },
  historyText: { color: '#aaa', fontSize: 10, marginTop: 4, textAlign: 'center' },
  historyTime: { color: '#666', fontSize: 8, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  modalImage: { width: width * 0.9, height: height * 0.7 },
  toast: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', zIndex: 1000 },
  toastText: { color: '#fff', fontSize: 14 },
});
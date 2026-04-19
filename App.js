import 'formdata-polyfill';
import React, { useState, useEffect, useRef } from 'react';
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
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

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
  const [prompt, setPrompt] = useState('');
  const [modelImage, setModelImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [duration, setDuration] = useState(5);
  const [digitalImage, setDigitalImage] = useState(null);
  const [digitalText, setDigitalText] = useState('');
  const [digitalVoice, setDigitalVoice] = useState('温柔女声');
  const [digitalName, setDigitalName] = useState('');
  const [multiImages, setMultiImages] = useState([]);
  const [customVideo, setCustomVideo] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentQRCode, setPaymentQRCode] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [loginMode, setLoginMode] = useState('password');
  const [loginCode, setLoginCode] = useState('');
  const [digitalHumans, setDigitalHumans] = useState([]);
  const [membershipLevel, setMembershipLevel] = useState('free');
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  // 找回密码相关 state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetCountdown, setResetCountdown] = useState(0);
  const [rechargePackages, setRechargePackages] = useState([
    { id: 1, name: '小试牛刀', credits: 100, price: 9.9, discount: 0 },
    { id: 2, name: '进阶创作', credits: 350, price: 29.9, discount: 20, bonus: 20 },
    { id: 3, name: '专业玩家', credits: 900, price: 69.9, discount: 100, bonus: 100 },
    { id: 4, name: '商业大师', credits: 2000, price: 149.9, discount: 300, bonus: 300 },
  ]);
  const [membershipPackages, setMembershipPackages] = useState([
    { id: 1, name: '黄金会员', price: 29, monthlyCredits: 600, originalPrice: 58, features: ['无水印', '优先队列', '基础模式'] },
    { id: 2, name: '铂金会员', price: 69, monthlyCredits: 1800, originalPrice: 138, features: ['高清模式', '优先队列', '首尾帧控制'] },
    { id: 3, name: '钻石会员', price: 129, monthlyCredits: 4500, originalPrice: 258, features: ['专业模式', '最高优先级', '视频延长', '商业授权'] },
  ]);
  // 注册三步流程状态
  const [registerStep, setRegisterStep] = useState('phone'); // 'phone', 'code', 'password'
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [countdown, setCountdown] = useState(0);
  // 新增：登录验证码倒计时
  const [loginCountdown, setLoginCountdown] = useState(0);
  // 新增：创建一个ref来稳定地保存验证码
  const savedRegisterCode = useRef('');
  // 获取当前用户灵境点余额（直接从 localStorage 读取 token）

  const fetchUserCredits = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('没有 token，无法获取余额');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('fetchUserCredits 完整响应:', res.data);
      const newCredits = res.data.data.credits;
      console.log('获取到的余额:', newCredits);
      setUserCredits(newCredits);
    } catch (err) {
      console.log('获取余额失败', err);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      setAccessToken(token);
      fetchDigitalHumans();
      fetchUserCredits();  // ✅ 添加这一行
    }
  }, []);

  useEffect(() => {
    setPrompt('');
    setHeight('170');
    setResult(null);
  }, [activeTab]);

  // 检查是否从支付宝支付页面返回，刷新余额
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const outTradeNo = urlParams.get('out_trade_no');
    if (outTradeNo) {
      console.log('检测到支付宝返回，订单号:', outTradeNo);
      // 直接刷新页面，让页面重新加载所有数据
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 1000);
    }
  }, []);

  const handleLogin = async () => {
    if (!loginPhone.trim()) return showToast('请输入手机号');
    if (loginMode === 'password' && !loginPassword.trim()) return showToast('请输入密码');
    if (loginMode === 'code' && !loginCode.trim()) return showToast('请输入验证码');
    setLoading(true);
    const payload = { phone: loginPhone };
    if (loginMode === 'password') {
      payload.password = loginPassword;
    } else {
      payload.code = loginCode;
    }
    console.log('发送登录请求:', payload);  // 添加日志
    try {
      const res = await axios.post(`${API_URL}/auth/login`, payload);
      console.log('登录响应:', res.data);  // 添加日志
      const token = res.data.data.access_token;
      const credits = res.data.data.credits;
      localStorage.setItem('access_token', token);
      setAccessToken(token);
      setUserCredits(credits);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      fetchDigitalHumans();
      showToast('登录成功');
    } catch (err) {
      console.error('登录错误:', err.response?.data);  // 添加日志
      showToast(err.response?.data?.detail || '登录失败', true);
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!loginPhone.trim()) return showToast('请输入手机号');
    if (loginPhone.length !== 11) return showToast('请输入11位手机号');
    if (loginCountdown > 0) return showToast(`请等待${loginCountdown}秒后再试`);
  
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/send_code`, { phone: loginPhone });
      console.log('发送验证码响应:', response.data);
      if (response.data.code === 200) {
        showToast('验证码已发送');
        // 开始倒计时
        setLoginCountdown(60);
        const timer = setInterval(() => {
          setLoginCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        showToast(response.data.message || '发送失败', true);
      }
    } catch (err) {
      console.error('发送验证码错误:', err);
      showToast(err.response?.data?.detail || '发送失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAccessToken('');
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setUserCredits(0);
    setDigitalHumans([]);
    setShowSidebarMenu(false);
    showToast('已退出登录');
  };


  const isWeb = Platform.OS === 'web';
  const isMobileBrowser = isWeb && /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);
  const isDesktopBrowser = isWeb && !isMobileBrowser;
  const isInsideAlipay = isWeb && /AlipayClient/i.test(window.navigator.userAgent);
  const getQRCodeImageUrl = (qrCodeValue) => {
    if (!qrCodeValue) return '';
    if (/^https?:\/\//i.test(qrCodeValue)) {
      return qrCodeValue;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCodeValue)}`;
  };

  // Expo Web 场景下，根据 channel 决定支付宝唤起方式。
  const doAlipayPay = (payUrl, channel) => {
    if (!isWeb || !payUrl) {
      showToast('当前环境暂不支持支付宝网页唤起', true);
      return;
    }

    if (channel === 'pc_qr') {
      // 桌面端新开标签页，降低浏览器拦截概率。
      window.open(payUrl, '_blank');
      return;
    }

    if (channel === 'mobile_wap') {
      window.location.href = payUrl;
      return;
    }

    if (isInsideAlipay && window.AlipayJSBridge) {
      const tradePayPayload = /^https?:\/\//i.test(payUrl)
        ? { url: payUrl }
        : { orderStr: payUrl };

      window.AlipayJSBridge.call('tradePay', tradePayPayload, (result) => {
        if (result?.resultCode === '9000') {
          showToast('支付成功');
          setTimeout(() => {
            console.log('支付成功，开始刷新余额');
            fetchUserCredits();
            console.log('余额刷新完成，准备刷新页面');
            window.location.reload();
          }, 2000);
          return;
        }

        if (result?.resultCode === '6001') {
          showToast('已取消支付', true);
          return;
        }

        showToast('支付未完成，请稍后查询订单状态', true);
      });
      return;
    }

    if (isDesktopBrowser) {
      window.open(payUrl, '_blank');
    } else {
      window.location.href = payUrl;
    }
  };

  // 发送找回密码验证码
  const sendResetCode = async () => {
    if (!resetPhone.trim()) return showToast('请输入手机号');
    if (resetPhone.length !== 11) return showToast('请输入11位手机号');
    if (resetCountdown > 0) return showToast(`请等待${resetCountdown}秒后再试`);
  
    try {
      await axios.post(`${API_URL}/auth/send_code`, { phone: resetPhone });
      showToast('验证码已发送');
      setResetCountdown(60);
      const timer = setInterval(() => {
        setResetCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast('发送失败', true);
    }
  };

  // 确认重置密码
  const handleResetPassword = async () => {
    if (!resetPhone.trim()) return showToast('请输入手机号');
    if (!resetCode.trim()) return showToast('请输入验证码');
    if (!resetPassword.trim() || resetPassword.length < 6) return showToast('密码至少6位');
  
    try {
      await axios.post(`${API_URL}/auth/reset_password`, {
        phone: resetPhone,
        code: resetCode,
        new_password: resetPassword
      });
      showToast('密码重置成功，请登录');
      setShowResetPasswordModal(false);
      setResetPhone('');
      setResetCode('');
      setResetPassword('');
    } catch (err) {
      showToast(err.response?.data?.detail || '重置失败', true);
    }
  };

  const handleRecharge = async (pkg) => {
    if (!accessToken) {
      showToast('请先登录', true);
      setShowRechargeModal(false);
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/payment/create_order`, {
        package_id: pkg.id,
        amount: pkg.price,
        credits: pkg.credits
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const {
        pay_url,
        qr_code,
        channel,
        out_trade_no,
      } = res.data;

      setShowRechargeModal(false);
      setPendingOrderId(out_trade_no || '');
      setPaymentLink(pay_url || '');
      setPaymentQRCode('');
      setShowPaymentModal(false);

      // ✅ 关键修改：只要 qr_code 存在，就显示二维码
      if (qr_code) {
        console.log("收到二维码，显示支付弹窗");
        setPaymentQRCode(qr_code);
        console.log("qr_code的值:", qr_code);  // ✅ 添加这一行
        setShowPaymentModal(true);
        setShowRechargeModal(false);
        return;
      }

      if (channel === 'mobile_wap' && pay_url) {
        // 手机端 H5 支付：跳转支付宝页面。
        doAlipayPay(pay_url, channel);
        return;
      }

      // 兜底：桌面端尽量打开支付链接，移动端直接跳转。
      if (pay_url) {
        doAlipayPay(pay_url, isDesktopBrowser ? 'pc_qr' : 'mobile_wap');
      } else {
        showToast('支付链接获取失败', true);
      }

    } catch (err) {
      showToast(err.response?.data?.detail || '创建订单失败', true);
    } finally {
      setLoading(false);
    }
  };
  const handleMembership = async (pkg) => {
    showToast(`开通 ${pkg.name}，功能开发中`);
  };

  const fetchDigitalHumans = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/digital-human/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDigitalHumans(res.data.data.items || []);
    } catch (err) {
      console.log('获取数字人列表失败', err);
    }
  };
    // 发送注册验证码
  const sendRegisterCode = async () => {
    if (!registerPhone.trim()) return showToast('请输入手机号');
    if (registerPhone.length !== 11) return showToast('请输入11位手机号');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/send_code`, { phone: registerPhone });
      showToast('验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast(err.response?.data?.detail || '发送失败', true);
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码
  const verifyCode = async () => {
    if (!registerCode.trim()) return showToast('请输入验证码');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify_code`, {
        phone: registerPhone,
        code: registerCode
      });
      if (res.data.code === 200) {
        // 关键：将验证码同时保存到 ref 中
        savedRegisterCode.current = registerCode;
        setRegisterStep('password');
        showToast('验证成功，请设置密码');
      }
    } catch (err) {
      showToast(err.response?.data?.detail || '验证码错误', true);
    } finally {
      setLoading(false);
    }
  };

  // 完成注册
  const completeRegister = async () => {
    if (!registerPassword.trim()) return showToast('请输入密码');
    if (registerPassword.length < 6) return showToast('密码至少6位');
    setLoading(true);
    try {
      // 关键：从 ref 中获取保存的验证码
      const codeToUse = savedRegisterCode.current;
      console.log('使用的验证码:', codeToUse);
    
      const res = await axios.post(`${API_URL}/auth/register`, {
        phone: registerPhone,
        code: codeToUse, // 使用 ref 中的验证码
        password: registerPassword,
        username: registerUsername || null
      });
      const token = res.data.data.access_token;
      const credits = res.data.data.credits;
      localStorage.setItem('access_token', token);
      setAccessToken(token);
      setUserCredits(credits);
      setIsLoggedIn(true);
      setShowRegisterModal(false);
      // 重置所有注册相关的状态
      setRegisterStep('phone');
      setRegisterPhone('');
      setRegisterCode('');
      setRegisterPassword('');
      setRegisterUsername('');
      savedRegisterCode.current = ''; // 清空 ref
      showToast('注册成功');
    } catch (err) {
      console.log('注册错误:', err.response?.data);
      showToast(err.response?.data?.detail || '注册失败', true);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  // 检查灵境点余额是否足够
  const checkAndUseCredits = (cost, actionName, callback) => {
    if (userCredits < cost) {
      showToast(`${actionName}需要${cost}灵境点，余额不足，请充值`, true);
      setShowRechargeModal(true);
      return false;
    }
    if (callback) callback();
    return true;
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
  // 保存文件到本地相册（移动端）或下载（Web）
  const saveToGallery = async (url, type) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = `${type}_${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;

      if (Platform.OS === 'web') {
        // Web端：触发下载
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast('文件已下载，请手动保存到相册');
      } else {
        // 移动端：保存到相册
        const fileInfo = await FileSystem.downloadAsync(url, FileSystem.documentDirectory + filename);
        const asset = await MediaLibrary.createAssetAsync(fileInfo.uri);
        await MediaLibrary.saveToLibraryAsync(asset);
        showToast('已保存到相册');
      }
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败，请重试', true);
    }
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

  const pickModelImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setModelImage(res.assets[0]);
      }
    });
  };

  const pickGarmentImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setGarmentImage(res.assets[0]);
      }
    });
  };

  const pickDigitalImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setDigitalImage(res.assets[0]);
      }
    });
  };

  const pickCustomVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/x-msvideo';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setCustomVideo(file);
      }
    };
    input.click();
  };

  const pickMultiImage = () => {
    if (multiImages.length >= 4) {
      showToast('最多上传4张照片', true);
      return;
    }
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res) => {
      if (res.assets && res.assets[0]) {
        setMultiImages([...multiImages, res.assets[0]]);
      }
    });
  };

  const convertToFile = async (imageAsset) => {
    // 如果已经是标准 File 对象，直接返回
    if (imageAsset && imageAsset.name && imageAsset.type && !imageAsset.uri) {
      // 清理文件名，移除特殊字符
      const safeName = imageAsset.name.replace(/[^a-zA-Z0-9.\u4e00-\u9fa5]/g, '_');
      return new File([imageAsset], safeName, { type: imageAsset.type });
    }
  
    const uri = imageAsset.uri;
    if (uri && uri.startsWith('data:')) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const safeName = `image_${Date.now()}.jpg`;
      return new File([blob], safeName, { type: blob.type });
    }
  
    // 如果是本地文件路径，使用 fetch 获取 blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const originalName = imageAsset.fileName || 'photo.jpg';
    const ext = originalName.split('.').pop() || 'jpg';
    const safeName = `image_${Date.now()}.${ext}`;
    return new File([blob], safeName, { type: blob.type || 'image/jpeg' });
  };

  const recommendSize = async () => {
    if (!checkAndUseCredits(2, '尺码推荐', () => {})) return;
    if (!selectedImage) return showToast('请先选择一张照片');
    setLoading(true);
  
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    const ext = file.name?.split('.').pop() || 'jpg';
    const safeFile = new File([file], `size_${Date.now()}.${ext}`, { type: file.type });
    formData.append('image', safeFile);
    formData.append('height', height);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/size/recommend`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '请求失败');
      }

      const res = await response.json();
      console.log('尺码推荐响应:', res);
    
      // 提取尺码数据
      const outputData = res.data?.data?.output_data || res.data?.output_data;
    
      if (!outputData) {
        console.error('无法提取尺码数据:', res);
        showToast('尺码推荐成功，但无法获取结果', true);
        return;
      }
    
      setResult(outputData);
      showToast('尺码推荐完成');
    } catch (err) {
      console.error('尺码推荐错误:', err);
      showToast(err.message || '请求失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!checkAndUseCredits(5, '图片生成', () => {})) return;
    if (!selectedImage) return showToast('请先选择一张参考图片');
    setLoading(true);
  
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    const ext = file.name?.split('.').pop() || 'jpg';
    const safeFile = new File([file], `image_${Date.now()}.${ext}`, { type: file.type });
    formData.append('reference_image', safeFile);
    formData.append('prompt', prompt || '生成一张高质量的图片');
    formData.append('width', '512');
    formData.append('height', '512');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/image/generate`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成失败');
      }

      const res = await response.json();
      console.log('图片生成响应:', res);
    
      // 提取图片 URL
      const imgUrl = res.data?.data?.output_data?.images?.[0]?.url ||
                     res.data?.output_data?.images?.[0]?.url ||
                     res.data?.images?.[0]?.url;
    
      if (!imgUrl) {
        console.error('无法提取图片 URL:', res);
        showToast('图片生成成功，但无法获取链接', true);
        return;
      }
    
      setResult(res.data?.data?.output_data || res.data?.output_data);
      saveToHistory(imgUrl, '图片生成');
      showToast('图片生成成功');
    } catch (err) {
      console.error('图片生成错误:', err);
      showToast(err.message || '生成失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    const cost = duration === 5 ? 10 : 15;
    if (!checkAndUseCredits(cost, `${duration}秒视频生成`, () => {})) return;
    if (!selectedImage) return showToast('请先选择一张图片');
    setLoading(true);
  
    const formData = new FormData();
    const file = await convertToFile(selectedImage);
    const ext = file.name?.split('.').pop() || 'jpg';
    const safeFile = new File([file], `video_${Date.now()}.${ext}`, { type: file.type });
    formData.append('image', safeFile);
    formData.append('prompt', prompt || '生成动态视频');
    formData.append('duration', duration.toString());
    formData.append('mode', 'std');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/video/generate`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成失败');
      }

      const res = await response.json();
      console.log('视频生成响应:', res);
    
      // 获取视频 URL（兼容不同的响应格式）
      const videoUrl = res.data?.data?.output_data?.video_url || 
                       res.data?.output_data?.video_url || 
                       res.data?.video_url;
    
      if (!videoUrl) {
        console.error('无法从响应中提取视频 URL:', res);
        showToast('视频生成成功，但无法获取链接', true);
        return;
      }
    
      console.log('视频 URL:', videoUrl);
      setResult({ video_url: videoUrl });
      saveToHistory(videoUrl, '视频生成');
      showToast('视频生成成功');
    } catch (err) {
      console.error('视频生成错误:', err);
      showToast(err.message || '生成失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateTryon = async () => {
    if (!checkAndUseCredits(15, '虚拟试穿', () => {})) return;
    if (!modelImage) return showToast('请先选择模特图片');
    if (!garmentImage) return showToast('请先选择服装图片');
    setLoading(true);
  
    const formData = new FormData();
  
    const modelFile = await convertToFile(modelImage);
    const modelExt = modelFile.name?.split('.').pop() || 'jpg';
    const safeModel = new File([modelFile], `model_${Date.now()}.${modelExt}`, { type: modelFile.type });
    formData.append('model_image', safeModel);
  
    const garmentFile = await convertToFile(garmentImage);
    const garmentExt = garmentFile.name?.split('.').pop() || 'jpg';
    const safeGarment = new File([garmentFile], `garment_${Date.now()}.${garmentExt}`, { type: garmentFile.type });
    formData.append('garment_image', safeGarment);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/tryon/generate`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '试穿失败');
      }

      const res = await response.json();
      console.log('虚拟试穿响应:', res);
    
      const tryonUrl = res.data?.data?.output_data?.video_url ||
                       res.data?.output_data?.video_url ||
                       res.data?.video_url;
    
      if (!tryonUrl) {
        console.error('无法提取视频 URL:', res);
        showToast('试穿生成成功，但无法获取链接', true);
        return;
      }
    
      setResult(res.data?.data?.output_data || res.data?.output_data);
      saveToHistory(tryonUrl, '虚拟试穿');
      showToast('试穿视频生成成功');
    } catch (err) {
      console.error('虚拟试穿错误:', err);
      showToast(err.message || '试穿失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateDigitalHuman = async () => {
    if (!checkAndUseCredits(20, '数字人分身', () => {})) return;
    if (!digitalImage) return showToast('请先上传照片');
    if (!digitalText.trim()) return showToast('请输入说话内容');
    setLoading(true);
  
    const formData = new FormData();
    const imageFile = await convertToFile(digitalImage);
    const ext = imageFile.name?.split('.').pop() || 'jpg';
    const safeImage = new File([imageFile], `digital_${Date.now()}.${ext}`, { type: imageFile.type });
    formData.append('image', safeImage);
    formData.append('text', digitalText);
    formData.append('voice', digitalVoice);
    if (digitalName) formData.append('name', digitalName);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/digital-human/generate`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成失败');
      }

      const res = await response.json();
      console.log('数字人分身响应:', res);
    
      const videoUrl = res.data?.video_url || res.video_url;
    
      if (!videoUrl) {
        console.error('无法提取视频 URL:', res);
        showToast('数字人视频生成成功，但无法获取链接', true);
        return;
      }
    
      setResult({ video_url: videoUrl });
      saveToHistory(videoUrl, '数字人分身');
      showToast('数字人视频生成成功');
    } catch (err) {
      console.error('数字人分身错误:', err);
      showToast(err.message || '生成失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateDigitalHumanCustom = async () => {
    if (!checkAndUseCredits(10, '定制数字人', () => {})) return;
    if (!customVideo) return showToast('请先上传训练视频');
    if (!customName.trim()) return showToast('请输入数字人名称');
    setLoading(true);
  
    const formData = new FormData();
  
    // 清理视频文件名，移除特殊字符
    const videoExt = customVideo.name?.split('.').pop() || 'mp4';
    const safeVideoName = `video_${Date.now()}.${videoExt}`;
    const safeVideo = new File([customVideo], safeVideoName, { type: customVideo.type || 'video/mp4' });
    formData.append('source_video', safeVideo);
    formData.append('name', customName);
    if (customDesc) formData.append('description', customDesc);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/digital-human/`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '定制失败');
      }

      const res = await response.json();
      console.log('数字人定制响应:', res);
    
      // 定制数字人没有返回文件 URL，只是提交任务
      showToast('数字人定制任务已提交');
      setCustomVideo(null);
      setCustomName('');
      setCustomDesc('');
    } catch (err) {
      console.error('数字人定制错误:', err);
      showToast(err.message || '定制失败', true);
    } finally {
      setLoading(false);
    }
  };

  const generateMultiAngle = async () => {
    if (!checkAndUseCredits(15, '多角度试穿', () => {})) return;
    if (multiImages.length < 2) return showToast('请至少上传2张照片');
    setLoading(true);
  
    const formData = new FormData();
    for (let i = 0; i < multiImages.length; i++) {
      const file = await convertToFile(multiImages[i]);
      const ext = file.name?.split('.').pop() || 'jpg';
      const safeFile = new File([file], `multi_${Date.now()}_${i}.${ext}`, { type: file.type });
      formData.append('images', safeFile);
    }
    formData.append('prompt', prompt || '合成统一角色，自然光线');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/multi-angle/tryon`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '合成失败');
      }

      const res = await response.json();
      console.log('多角度合成响应:', res);
    
      const imageUrl = res.data?.data?.output_data?.image_url ||
                       res.data?.output_data?.image_url ||
                       res.data?.image_url;
    
      if (!imageUrl) {
        console.error('无法提取图片 URL:', res);
        showToast('多角度合成成功，但无法获取链接', true);
        return;
      }
    
      setResult({ images: [{ url: imageUrl }] });
      saveToHistory(imageUrl, '多角度试穿');
      showToast('多角度合成成功');
    } catch (err) {
      console.error('多角度合成错误:', err);
      showToast(err.message || '合成失败', true);
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
      case 'digital': generateDigitalHuman(); break;
      case 'digital_custom': generateDigitalHumanCustom(); break;
      default: break;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    // 通用下载函数
    const downloadFile = async (url, filename) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showToast('下载已开始');
      } catch (err) {
        console.error('下载失败:', err);
        showToast('下载失败，请重试', true);
      }
    };

    // 尺码推荐
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
    }

    // 图片或图片数组
    if ((activeTab === 'image' || activeTab === 'multi') && result.images) {
      const imageUrl = result.images[0].url;
      const filename = `${activeTab === 'image' ? 'image' : 'multiangle'}_${Date.now()}.png`;
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>{activeTab === 'image' ? '✨ 生成图片' : '🔄 多角度合成'}</Text>
          <TouchableOpacity onPress={() => { setPreviewUrl(imageUrl); setModalVisible(true); }}>
            <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={() => { navigator.clipboard.writeText(imageUrl); showToast('链接已复制'); }} style={styles.actionButton}>
              <Icon name="copy-outline" size={18} color="#7c3aed" />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => downloadFile(imageUrl, filename)} style={styles.actionButton}>
              <Icon name="download-outline" size={18} color="#10b981" />
              <Text style={styles.actionText}>下载</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => saveToGallery(imageUrl, 'image')} style={styles.actionButton}>
              <Icon name="image-outline" size={18} color="#f59e0b" />
              <Text style={styles.actionText}>保存相册</Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

    // 视频（包括虚拟试穿、数字人分身等）
    if ((activeTab === 'video' || activeTab === 'tryon' || activeTab === 'digital') && result.video_url) {
      const videoUrl = result.video_url;
      const filename = `${activeTab === 'video' ? 'video' : activeTab === 'tryon' ? 'tryon' : 'digital'}_${Date.now()}.mp4`;
  
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            {activeTab === 'video' ? '🎬 生成视频' : activeTab === 'tryon' ? '👗 试穿结果' : '🤖 数字人视频'}
          </Text>
          <Video
            source={{ uri: videoUrl }}
            style={styles.resultVideo}
            resizeMode="contain"
            useNativeControls
            onError={(e) => console.log('视频播放错误', e)}
          />
          <View style={styles.buttonGroup}>
            <TouchableOpacity onPress={() => { navigator.clipboard.writeText(videoUrl); showToast('链接已复制'); }} style={styles.actionButton}>
              <Icon name="copy-outline" size={18} color="#7c3aed" />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => downloadFile(videoUrl, filename)} style={styles.actionButton}>
              <Icon name="download-outline" size={18} color="#10b981" />
              <Text style={styles.actionText}>下载</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => saveToGallery(videoUrl, 'video')} style={styles.actionButton}>
              <Icon name="videocam-outline" size={18} color="#f59e0b" />
              <Text style={styles.actionText}>保存相册</Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

  const tabs = [
    { key: 'size', icon: 'body-outline', label: '尺码', color: '#7c3aed' },
    { key: 'image', icon: 'image-outline', label: '图片', color: '#10b981' },
    { key: 'video', icon: 'videocam-outline', label: '视频', color: '#f59e0b' },
    { key: 'tryon', icon: 'shirt-outline', label: '试穿', color: '#ef4444' },
    { key: 'digital', icon: 'person-circle-outline', label: '数字人', color: '#06b6d4' },
    { key: 'digital_custom', icon: 'construct-outline', label: '定制', color: '#f97316' },
    { key: 'multi', icon: 'albums-outline', label: '多角度', color: '#8b5cf6' },
    { key: 'profile', icon: 'person-outline', label: '我的', color: '#7c3aed' },
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

        {/* 其他 Tab 内容（放在 ScrollView 内） */}
        {activeTab !== 'profile' && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab !== 'tryon' && activeTab !== 'digital' && activeTab !== 'multi' && (
              <Card style={styles.imageCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {activeTab === 'size' ? '📸 上传全身照' :
                     activeTab === 'image' ? '🎨 上传参考图' :
                     activeTab === 'video' ? '🎥 上传图片' : ''}
                  </Text>
                  {selectedImage && (
                    <TouchableOpacity onPress={() => { setSelectedImage(null); setResult(null); }} style={styles.deleteButton}>
                      <Icon name="close-circle-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                  {selectedImage ? (
                    <>
                      <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.overlayText}>点击更换</Text>
                      </View>
                    </>
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
            )}

            {activeTab === 'tryon' && (
              <>
                <Card style={styles.imageCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>👤 上传模特图</Text>
                    {modelImage && (
                      <TouchableOpacity onPress={() => setModelImage(null)} style={styles.deleteButton}>
                        <Icon name="close-circle-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={pickModelImage} style={styles.imagePicker}>
                    {modelImage ? (
                      <>
                        <Image source={{ uri: modelImage.uri }} style={styles.previewImage} />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.placeholder}>
                        <Icon name="person-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>点击上传模特图</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.iconButton} onPress={pickModelImage}>
                      <Icon name="images-outline" size={20} color="#fff" />
                      <Text style={styles.iconButtonText}>相册</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={pickModelImage}>
                      <Icon name="camera-outline" size={20} color="#fff" />
                      <Text style={styles.iconButtonText}>拍照</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
                <Card style={styles.imageCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>👕 上传服装图</Text>
                    {garmentImage && (
                      <TouchableOpacity onPress={() => setGarmentImage(null)} style={styles.deleteButton}>
                        <Icon name="close-circle-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={pickGarmentImage} style={styles.imagePicker}>
                    {garmentImage ? (
                      <>
                        <Image source={{ uri: garmentImage.uri }} style={styles.previewImage} />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.placeholder}>
                        <Icon name="shirt-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>点击上传服装图</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.iconButton} onPress={pickGarmentImage}>
                      <Icon name="images-outline" size={20} color="#fff" />
                      <Text style={styles.iconButtonText}>相册</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={pickGarmentImage}>
                      <Icon name="camera-outline" size={20} color="#fff" />
                      <Text style={styles.iconButtonText}>拍照</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </>
            )}

            {activeTab === 'digital' && (
              <>
                <Card style={styles.imageCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>📸 上传照片</Text>
                    {digitalImage && (
                      <TouchableOpacity onPress={() => setDigitalImage(null)} style={styles.deleteButton}>
                        <Icon name="close-circle-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={pickDigitalImage} style={styles.imagePicker}>
                    {digitalImage ? (
                      <>
                        <Image source={{ uri: digitalImage.uri }} style={styles.previewImage} />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.placeholder}>
                        <Icon name="person-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>点击上传照片</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Card>
                <Card style={styles.promptCard}>
                  <Text style={styles.cardTitle}>💬 输入说话内容</Text>
                  <TextInput
                    style={styles.promptInput}
                    value={digitalText}
                    onChangeText={setDigitalText}
                    placeholder="例如：大家好，我是灵境AI平台创造的数字人，很高兴认识大家！"
                    placeholderTextColor="#888"
                    multiline
                  />
                </Card>
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>🎵 选择音色</Text>
                  <View style={styles.voiceRow}>
                    {['温柔女声', '沉稳男声', '可爱童声', '磁性男声'].map(voice => (
                      <TouchableOpacity
                        key={voice}
                        style={[styles.voiceButton, digitalVoice === voice && styles.voiceButtonActive]}
                        onPress={() => setDigitalVoice(voice)}
                      >
                        <Text style={[styles.voiceText, digitalVoice === voice && styles.voiceTextActive]}>{voice}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>📛 数字人名称（可选）</Text>
                  <TextInput
                    style={styles.promptInput}
                    value={digitalName}
                    onChangeText={setDigitalName}
                    placeholder="我的数字人"
                    placeholderTextColor="#888"
                  />
                </Card>
              </>
            )}

            {activeTab === 'digital_custom' && (
              <>
                <Card style={styles.imageCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>🎥 上传训练视频</Text>
                    {customVideo && (
                      <TouchableOpacity onPress={() => setCustomVideo(null)} style={styles.deleteButton}>
                        <Icon name="close-circle-outline" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={pickCustomVideo} style={styles.imagePicker}>
                    {customVideo ? (
                      <View style={styles.placeholder}>
                        <Icon name="videocam-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>{customVideo.name}</Text>
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.placeholder}>
                        <Icon name="videocam-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>点击上传视频（MP4）</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Card>
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>📛 数字人名称</Text>
                  <TextInput
                    style={styles.promptInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="例如：我的专属数字人"
                    placeholderTextColor="#888"
                  />
                </Card>
                <Card style={styles.promptCard}>
                  <Text style={styles.cardTitle}>📝 描述（可选）</Text>
                  <TextInput
                    style={styles.promptInput}
                    value={customDesc}
                    onChangeText={setCustomDesc}
                    placeholder="描述这个数字人的特点"
                    placeholderTextColor="#888"
                    multiline
                  />
                </Card>
              </>
            )}

            {activeTab === 'multi' && (
              <Card style={styles.imageCard}>
                <Text style={styles.cardTitle}>🖼️ 上传多张照片（2-4张）</Text>
                <View style={styles.multiImageRow}>
                  {multiImages.map((img, idx) => (
                    <View key={idx} style={styles.multiImageItem}>
                      <Image source={{ uri: img.uri }} style={styles.multiPreview} />
                      <TouchableOpacity onPress={() => setMultiImages(multiImages.filter((_, i) => i !== idx))} style={styles.removeMultiImage}>
                        <Icon name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {multiImages.length < 4 && (
                    <TouchableOpacity onPress={pickMultiImage} style={styles.addImageButton}>
                      <Icon name="add-circle-outline" size={48} color="#666" />
                      <Text style={styles.addImageText}>添加照片</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            )}

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

            {(activeTab === 'image' || activeTab === 'video' || activeTab === 'tryon' || activeTab === 'multi') && (
              <Card style={styles.promptCard}>
                <Text style={styles.cardTitle}>
                  💬 描述{' '}
                  {activeTab === 'image' ? '图片' : activeTab === 'video' ? '视频' : activeTab === 'tryon' ? '试穿效果' : '合成效果'}
                </Text>
                <TextInput
                  style={styles.promptInput}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={
                    activeTab === 'image' ? '例如：把衣服穿在模特身上，自然光线，4K高清...' :
                    activeTab === 'video' ? '例如：衣服随风飘动，模特在T台上走秀...' :
                    activeTab === 'tryon' ? '例如：自然贴合，光线柔和...' :
                    '例如：统一角色，正面站立，自然光线...'
                  }
                  placeholderTextColor="#888"
                  multiline
                />
              </Card>
            )}

            {activeTab === 'video' && (
              <Card style={styles.inputCard}>
                <Text style={styles.cardTitle}>⏱️ 视频时长</Text>
                <View style={styles.durationRow}>
                  {[5, 10, 15].map(sec => (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.durationButton, duration === sec && styles.durationButtonActive]}
                      onPress={() => setDuration(sec)}
                    >
                      <Text style={[styles.durationText, duration === sec && styles.durationTextActive]}>{sec}秒</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}

            <TouchableOpacity onPress={handleGenerate} disabled={loading} style={styles.generateButton}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.generateText}>
                  {activeTab === 'size' ? '开始尺码推荐' :
                   activeTab === 'image' ? '开始生成图片' :
                   activeTab === 'video' ? '开始生成视频' :
                   activeTab === 'tryon' ? '开始虚拟试穿' :
                   activeTab === 'digital' ? '生成数字人视频' :
                   activeTab === 'digital_custom' ? '开始定制数字人' :
                   activeTab === 'multi' ? '开始多角度合成' : '开始'}
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
                        if (item.type === '图片生成' || item.type === '多角度试穿') {
                          setResult({ images: [{ url: item.url }] });
                          setActiveTab(item.type === '图片生成' ? 'image' : 'multi');
                        } else {
                          setResult({ video_url: item.url });
                          setActiveTab(item.type === '视频生成' ? 'video' : (item.type === '虚拟试穿' ? 'tryon' : 'digital'));
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
        )}

        {/* 我的页面 - 单独放在外面 */}
        {activeTab === 'profile' && (
          <View style={{ flex: 1, position: 'relative' }}>
            <View style={styles.profileHeaderBar}>
              <View style={{ width: 40 }} />
              <Text style={styles.headerTitle}>我的</Text>
              <TouchableOpacity onPress={() => setShowSidebarMenu(!showSidebarMenu)} style={styles.menuButton}>
                <Icon name="menu-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {showSidebarMenu && (
              <>
                <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowSidebarMenu(false)} />
                <View style={styles.dropdownMenu}>
                  <View style={styles.dropdownUserInfo}>
                    <Icon name="person-circle" size={50} color="#7c3aed" />
                    <Text style={styles.dropdownUserName}>{isLoggedIn ? (loginPhone || '用户') : '未登录'}</Text>
                    {isLoggedIn && <Text style={styles.dropdownUserPhone}>{loginPhone}</Text>}
                  </View>
                  <View style={styles.dropdownCredits}>
                    <Text style={styles.dropdownCreditsLabel}>灵境点余额</Text>
                    <Text style={styles.dropdownCreditsValue}>{userCredits}</Text>
                    <TouchableOpacity onPress={() => setShowRechargeModal(true)}>
                      <Text style={styles.dropdownRechargeText}>充值</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dropdownMembership}>
                    <Text style={{ color: '#fff' }}>
                      当前会员：{membershipLevel === 'free' ? '免费版' : membershipLevel === 'gold' ? '黄金会员' : membershipLevel === 'platinum' ? '铂金会员' : '钻石会员'}
                    </Text>
                  </View>
                  <Text style={[styles.dropdownSectionTitle, { color: '#aaa' }]}>我的数字人</Text>
                  {digitalHumans.filter(d => !d.is_default).map(human => (
                    <View key={human.id} style={styles.dropdownHumanItem}>
                      <Text style={{ color: '#fff' }}>{human.name}</Text>
                      <Text style={{ color: '#aaa' }}>{human.is_active ? '✅' : '⏳'}</Text>
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => showToast('账号安全开发中')}>
                    <Text style={{ color: '#fff' }}>账号安全</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast('消费记录开发中')}>
                    <Text style={{ color: '#fff' }}>消费记录</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast('关于我们开发中')}>
                    <Text style={{ color: '#fff' }}>关于我们</Text>
                  </TouchableOpacity>
                  {isLoggedIn && (
                    <TouchableOpacity onPress={handleLogout} style={{ marginTop: 12 }}>
                      <Text style={{ color: '#ef4444' }}>退出登录</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {isLoggedIn ? (
              <View style={styles.profileContent}>
                <Text style={styles.welcomeText}>欢迎回来</Text>
                <Text style={styles.welcomeSubText}>灵境点余额: {userCredits}</Text>
                <TouchableOpacity style={styles.rechargeButton} onPress={() => setShowRechargeModal(true)}>
                  <Text style={styles.rechargeButtonText}>充值</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.loginPrompt}>
                <Icon name="person-circle-outline" size={80} color="#666" />
                <Text style={styles.loginPromptText}>登录后享受更多功能</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => setShowLoginModal(true)}>
                  <Text style={styles.loginButtonText}>立即登录</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 登录弹窗 */}
        <Modal visible={showLoginModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <Card style={styles.loginCard}>
              <Text style={styles.cardTitle}>登录</Text>
              <View style={styles.loginModeRow}>
                <TouchableOpacity
                  style={[styles.loginModeButton, loginMode === 'password' && styles.loginModeActive]}
                  onPress={() => setLoginMode('password')}
                >
                  <Text style={[styles.loginModeText, loginMode === 'password' && styles.loginModeTextActive]}>密码登录</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.loginModeButton, loginMode === 'code' && styles.loginModeActive]}
                  onPress={() => setLoginMode('code')}
                >
                  <Text style={[styles.loginModeText, loginMode === 'code' && styles.loginModeTextActive]}>验证码登录</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.loginInput}
                placeholder="手机号"
                placeholderTextColor="#888"
                value={loginPhone}
                onChangeText={setLoginPhone}
                keyboardType="phone-pad"
              />
              {loginMode === 'password' && (
                <TextInput
                  style={styles.loginInput}
                  placeholder="密码"
                  placeholderTextColor="#888"
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />
              )}
              {loginMode === 'code' && (
                <View style={styles.codeRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="验证码"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={loginCode}
                    onChangeText={setLoginCode}
                  />
                  <TouchableOpacity 
                    style={[styles.getCodeButton, loginCountdown > 0 && { opacity: 0.5 }]} 
                    onPress={sendVerificationCode}
                    disabled={loginCountdown > 0}
                  >
                    <Text style={styles.getCodeText}>
                      {loginCountdown > 0 ? `${loginCountdown}秒后重试` : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.loginButtonRow}>
                <TouchableOpacity onPress={() => setShowLoginModal(false)} style={styles.loginCancelButton}>
                  <Text style={styles.loginButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogin} style={styles.loginConfirmButton}>
                  <Text style={styles.loginButtonText}>登录</Text>
                </TouchableOpacity>
              </View>
              {/* 去注册链接 */}
              <View style={styles.registerLinkRow}>
                <Text style={styles.registerLinkText}>还没有账号？</Text>
                <TouchableOpacity onPress={() => {
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}>
                  <Text style={styles.registerLink}>立即注册</Text>
                </TouchableOpacity>
              </View>
              {/* 忘记密码链接 */}
              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity onPress={() => {
                  setShowLoginModal(false);
                  setShowResetPasswordModal(true);
                }}>
                  <Text style={styles.forgotPasswordLink}>忘记密码？</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </Modal>
       
        {/* 注册弹窗 - 三步流程 */}
        <Modal visible={showRegisterModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <Card style={styles.loginCard}>
              <Text style={styles.cardTitle}>
                {registerStep === 'phone' ? '注册' : registerStep === 'code' ? '验证手机号' : '设置密码'}
              </Text>
              
              {/* 第一步：输入手机号 */}
              {registerStep === 'phone' && (
                <>
                  <TextInput
                    style={styles.loginInput}
                    placeholder="手机号"
                    placeholderTextColor="#888"
                    value={registerPhone}
                    onChangeText={setRegisterPhone}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.loginButtonRow}>
                    <TouchableOpacity onPress={() => setShowRegisterModal(false)} style={styles.loginCancelButton}>
                      <Text style={styles.loginButtonText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRegisterStep('code')} style={styles.loginConfirmButton}>
                      <Text style={styles.loginButtonText}>下一步</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {/* 第二步：输入验证码 */}
              {registerStep === 'code' && (
                <>
                  <View style={styles.codeRow}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="验证码"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      value={registerCode}
                      onChangeText={setRegisterCode}
                    />
                    <TouchableOpacity 
                      style={[styles.getCodeButton, countdown > 0 && { opacity: 0.5 }]} 
                      onPress={sendRegisterCode}
                      disabled={countdown > 0}
                    >
                      <Text style={styles.getCodeText}>{countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.loginButtonRow}>
                    <TouchableOpacity onPress={() => setRegisterStep('phone')} style={styles.loginCancelButton}>
                      <Text style={styles.loginButtonText}>上一步</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={verifyCode} style={styles.loginConfirmButton}>
                      <Text style={styles.loginButtonText}>验证</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {/* 第三步：设置密码 */}
              {registerStep === 'password' && (
                <>
                  <TextInput
                    style={styles.loginInput}
                    placeholder="密码（至少6位）"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                  />
                  <TextInput
                    style={styles.loginInput}
                    placeholder="昵称（可选）"
                    placeholderTextColor="#888"
                    value={registerUsername}
                    onChangeText={setRegisterUsername}
                  />
                  <View style={styles.loginButtonRow}>
                    <TouchableOpacity onPress={() => setRegisterStep('code')} style={styles.loginCancelButton}>
                      <Text style={styles.loginButtonText}>上一步</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={completeRegister} style={styles.loginConfirmButton}>
                      <Text style={styles.loginButtonText}>完成注册</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Card>
          </View>
        </Modal>

        {/* 找回密码弹窗 */}
        <Modal visible={showResetPasswordModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <Card style={styles.loginCard}>
              <Text style={styles.cardTitle}>找回密码</Text>
      
              <TextInput
                style={styles.loginInput}
                placeholder="手机号"
                placeholderTextColor="#888"
                value={resetPhone}
                onChangeText={setResetPhone}
                keyboardType="phone-pad"
              />
      
              <View style={styles.codeRow}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="验证码"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={resetCode}
                  onChangeText={setResetCode}
                />
                <TouchableOpacity 
                  style={[styles.getCodeButton, resetCountdown > 0 && { opacity: 0.5 }]} 
                  onPress={sendResetCode}
                  disabled={resetCountdown > 0}
                >
                  <Text style={styles.getCodeText}>
                    {resetCountdown > 0 ? `${resetCountdown}秒后重试` : '获取验证码'}
                  </Text>
                </TouchableOpacity>
              </View>
      
              <TextInput
                style={styles.loginInput}
                placeholder="新密码（至少6位）"
                placeholderTextColor="#888"
                secureTextEntry
                value={resetPassword}
                onChangeText={setResetPassword}
              />
      
              <View style={styles.loginButtonRow}>
                <TouchableOpacity onPress={() => setShowResetPasswordModal(false)} style={styles.loginCancelButton}>
                  <Text style={styles.loginButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResetPassword} style={styles.loginConfirmButton}>
                  <Text style={styles.loginButtonText}>确认重置</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </Modal>

        {/* 充值弹窗 */}
        <Modal visible={showRechargeModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <Card style={styles.rechargeCard}>
              <View style={styles.rechargeHeader}>
                <Text style={styles.rechargeTitle}>选择充值套餐</Text>
                <TouchableOpacity onPress={() => setShowRechargeModal(false)}>
                  <Icon name="close-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>灵境点充值</Text>
                {rechargePackages.map(pkg => (
                  <TouchableOpacity key={pkg.id} style={styles.rechargeItem} onPress={() => handleRecharge(pkg)}>
                    <View style={styles.rechargeItemLeft}>
                      <Text style={styles.rechargeItemName}>{pkg.name}</Text>
                      <Text style={styles.rechargeItemCredits}>{pkg.credits} 灵境点</Text>
                      {pkg.bonus && <Text style={styles.rechargeItemBonus}>赠送 {pkg.bonus} 点</Text>}
                    </View>
                    <View style={styles.rechargeItemRight}>
                      <Text style={styles.rechargeItemPrice}>¥{pkg.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={styles.sectionTitle}>会员套餐</Text>
                {membershipPackages.map(pkg => (
                  <TouchableOpacity key={pkg.id} style={styles.membershipItem} onPress={() => handleMembership(pkg)}>
                    <View style={styles.membershipItemLeft}>
                      <Text style={styles.membershipItemName}>{pkg.name}</Text>
                      <Text style={styles.membershipItemPrice}>¥{pkg.price}/月</Text>
                      <Text style={styles.membershipItemCredits}>送 {pkg.monthlyCredits} 灵境点/月</Text>
                    </View>
                    <View style={styles.membershipItemRight}>
                      <Text style={styles.membershipItemDiscount}>原价 ¥{pkg.originalPrice}</Text>
                      <View style={styles.membershipItemTag}>推荐</View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          </View>
        </Modal>

        <Modal visible={showPaymentModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <Card style={styles.paymentCard}>
              <Text style={styles.rechargeTitle}>支付宝扫码支付</Text>
              <Text style={styles.paymentHint}>
                请使用支付宝扫码完成付款，支付完成后返回此页面刷新余额。
              </Text>
              {/* ✅ 直接使用 img 标签，不用 getQRCodeImageUrl */}
              {!!paymentQRCode && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentQRCode)}`}
                  style={{ width: 280, height: 280, borderRadius: 16, marginBottom: 16 }}
                  alt="支付宝支付二维码"
                  onError={(e) => {
                    console.error('二维码生成失败，原始URL:', paymentQRCode);
                    e.target.alt = '二维码加载失败，请刷新重试';
                  }}
                />
              )}
              {!!pendingOrderId && (
                <Text selectable style={styles.paymentOrderText}>
                  订单号：{pendingOrderId}
                </Text>
              )}
              {!!paymentLink && (
                <TouchableOpacity
                  style={styles.paymentLinkButton}
                  onPress={() => doAlipayPay(paymentLink, 'pc_qr')}
                >
                  <Text style={styles.paymentLinkButtonText}>在新标签页打开支付</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={async () => {
                  await fetchUserCredits();
                  setShowPaymentModal(false);
                  window.location.reload();
                }}
                style={styles.closePaymentButton}
              >
                <Text style={styles.closePaymentText}>我已完成支付</Text>
              </TouchableOpacity>
            </Card>
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
  tabContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', backgroundColor: '#1a1a2e', marginHorizontal: 20, marginVertical: 15, borderRadius: 40, paddingVertical: 8 },
  tab: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 30 },
  activeTab: { backgroundColor: 'rgba(124,58,237,0.2)' },
  tabText: { fontSize: 12, marginTop: 4, color: '#888', fontWeight: '500' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  imageCard: { alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  deleteButton: { padding: 4 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16, alignSelf: 'flex-start' },
  imagePicker: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: 12 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#aaa', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 16 },
  iconButton: { flexDirection: 'row', backgroundColor: '#3b3b5c', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, alignItems: 'center', gap: 8 },
  iconButtonText: { color: '#fff', fontSize: 14 },
  inputCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heightInput: { backgroundColor: '#2d2d44', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, width: 100, color: '#fff', fontSize: 16, textAlign: 'center' },
  heightUnit: { color: '#aaa', fontSize: 14 },
  durationRow: { flexDirection: 'row', gap: 12 },
  durationButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#2d2d44' },
  durationButtonActive: { backgroundColor: '#7c3aed' },
  durationText: { color: '#aaa', fontSize: 14 },
  durationTextActive: { color: '#fff' },
  voiceRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  voiceButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#2d2d44' },
  voiceButtonActive: { backgroundColor: '#7c3aed' },
  voiceText: { color: '#aaa', fontSize: 14 },
  voiceTextActive: { color: '#fff' },
  promptCard: { padding: 20 },
  promptInput: { backgroundColor: '#2d2d44', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
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
  multiImageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  multiImageItem: { position: 'relative' },
  multiPreview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#2d2d44' },
  removeMultiImage: { position: 'absolute', top: -8, right: -8 },
  addImageButton: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  addImageText: { color: '#aaa', fontSize: 10, marginTop: 4 },
  loginCard: { width: '80%', padding: 20 },
  loginInput: { backgroundColor: '#2d2d44', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12 },
  loginButtonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  loginCancelButton: { flex: 1, backgroundColor: '#3b3b5c', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  loginConfirmButton: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // 去注册链接样式
  registerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerLinkText: {
    color: '#aaa',
    fontSize: 14,
  },
  registerLink: {
    color: '#7c3aed',
    fontSize: 14,
    marginLeft: 4,
  },
  profileCard: { alignItems: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
  profileInfo: { marginLeft: 15 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profilePhone: { color: '#aaa', marginTop: 4 },
  creditsCard: { backgroundColor: '#7c3aed', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 20 },
  creditsLabel: { color: '#ddd', fontSize: 14 },
  creditsValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  rechargeButton: { backgroundColor: '#10b981', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 30, marginBottom: 12 },
  rechargeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 30 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginPrompt: { alignItems: 'center', paddingVertical: 40 },
  loginPromptText: { color: '#aaa', fontSize: 16, marginTop: 16, marginBottom: 24 },
  loginButton: { backgroundColor: '#7c3aed', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 40 },
  profileHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  menuButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  profileContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  welcomeSubText: { fontSize: 14, color: '#aaa' },
  loginModeRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#3b3b5c' },
  loginModeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#2d2d44' },
  loginModeActive: { backgroundColor: '#7c3aed' },
  loginModeText: { color: '#aaa', fontSize: 14 },
  loginModeTextActive: { color: '#fff' },
  codeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  codeInput: { flex: 1, backgroundColor: '#2d2d44', borderRadius: 8, padding: 12, color: '#fff' },
  getCodeButton: { backgroundColor: '#3b3b5c', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  getCodeText: { color: '#7c3aed', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 20, marginBottom: 12 },
  humanItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  humanInfo: { marginLeft: 12, flex: 1 },
  humanName: { color: '#fff', fontSize: 16 },
  humanStatus: { color: '#aaa', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 280,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownUserInfo: { alignItems: 'center', marginBottom: 16 },
  dropdownUserName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  dropdownUserPhone: { color: '#aaa', fontSize: 12, marginTop: 4 },
  dropdownCredits: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 12, marginBottom: 16 },
  dropdownCreditsLabel: { color: '#ddd', fontSize: 12 },
  dropdownCreditsValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  dropdownRechargeText: { color: '#fff', fontSize: 12, marginTop: 8 },
  dropdownMembership: { backgroundColor: '#2d2d44', borderRadius: 8, padding: 8, marginBottom: 16 },
  dropdownSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#aaa', marginBottom: 8 },
  dropdownHumanItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rechargeCard: { width: '90%', maxHeight: '80%', padding: 20 },
  rechargeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rechargeTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rechargeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  rechargeItemLeft: { flex: 1 },
  rechargeItemName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  rechargeItemCredits: { fontSize: 14, color: '#7c3aed', marginTop: 4 },
  rechargeItemBonus: { fontSize: 12, color: '#10b981', marginTop: 2 },
  rechargeItemRight: { alignItems: 'flex-end' },
  rechargeItemPrice: { fontSize: 18, fontWeight: 'bold', color: '#7c3aed' },
  membershipItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  membershipItemLeft: { flex: 1 },
  membershipItemName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  membershipItemPrice: { fontSize: 14, color: '#f59e0b', marginTop: 4 },
  membershipItemCredits: { fontSize: 12, color: '#aaa', marginTop: 2 },
  membershipItemRight: { alignItems: 'flex-end' },
  membershipItemDiscount: { fontSize: 12, color: '#888', textDecorationLine: 'line-through' },
  membershipItemTag: { backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  paymentCard: {
    width: '80%',
    padding: 20,
    alignItems: 'center',
  },
  paymentHint: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentQRCodeImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  paymentOrderText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 12,
  },
  paymentLinkButton: {
    backgroundColor: '#1677ff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  paymentLinkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closePaymentButton: {
    marginTop: 20,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closePaymentText: {
    color: '#fff',
    fontSize: 16,
  },
  forgotPasswordRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  forgotPasswordLink: {
    color: '#7c3aed',
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  actionText: {
    color: '#ddd',
    fontSize: 12,
  },
  resultVideo: {
    width: width * 0.9,
    height: width * 0.9 * 0.5625,
    borderRadius: 16,
    backgroundColor: '#000',
    marginTop: 10,
  },
});
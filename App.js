import 'formdata-polyfill';
import React, { useState, useEffect, useRef } from 'react';
import { MANUAL_VOICES } from './src/data/manualVoices.js';
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
  Linking,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { Audio, Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://lingjing.preview.aliyun-zeabur.cn/api';
const HISTORY_KEY = 'lingjing_image_history'; 


const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// 检查是否已实名认证（已绑定手机号）
const checkPhoneVerified = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

export default function App() {
  // 注入全局样式，禁止移动端浏览器自动缩放字体
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        -webkit-text-size-adjust: none !important;
        text-size-adjust: none !important;
      }
      html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  // 首次启动隐私政策确认
  useEffect(() => {
    const privacyAgreed = localStorage.getItem('privacy_agreed');
    if (!privacyAgreed) {
      setShowPrivacyModal(true);
    }
  }, []);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const fullscreenVideoRef = useRef(null);
  // 形象预览视频 Modal 状态
  const [previewVideoVisible, setPreviewVideoVisible] = useState(false);
  const [currentPreviewVideoUrl, setCurrentPreviewVideoUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [height, setHeight] = useState('170');
  const [loading, setLoading] = useState(false); // 登录、验证码、充值、注册通用
  const [sizeLoading, setSizeLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [digitalLoading, setDigitalLoading] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [ecommerceLoading, setEcommerceLoading] = useState(false);
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
  const [clothCategory, setClothCategory] = useState('other');
  const [duration, setDuration] = useState(5);
  const [digitalImage, setDigitalImage] = useState(null);
    // 预设形象相关状态
  const [presetAvatars, setPresetAvatars] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState(null);
  const [avatarCategory, setAvatarCategory] = useState('all');
  const [digitalText, setDigitalText] = useState('');
  const [digitalVoice, setDigitalVoice] = useState('温柔女声');
    // ========== 新增：音色选择器相关状态 ==========
  const [ttsVoices, setTtsVoices] = useState([]);      // 存储从后端获取的音色列表
  const [selectedVoiceId, setSelectedVoiceId] = useState(null); // 当前选中的音色ID
  const [playingVoiceId, setPlayingVoiceId] = useState(null);    // 正在试听的音色ID
  const soundRef = useRef(null)
  const [digitalName, setDigitalName] = useState('');
  const [multiImages, setMultiImages] = useState([]);
  const [customVideo, setCustomVideo] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPrivacyContent, setShowPrivacyContent] = useState(false);
  const [showTermsContent, setShowTermsContent] = useState(false);
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
  const [digitalSubTab, setDigitalSubTab] = useState('ecommerce');
  const [ecommerceDescription, setEcommerceDescription] = useState('');
  const [ecommerceUrl, setEcommerceUrl] = useState('');
  const [ecommerceImage, setEcommerceImage] = useState(null);
  const [ecommerceDigitalImage, setEcommerceDigitalImage] = useState(null);
  const [ecommerceVideoUrl, setEcommerceVideoUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState('');
  const [generatingSubtitle, setGeneratingSubtitle] = useState('');
  const pollingRef = useRef(null); // 轮询定时器引用

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
    // 初始化音频模式
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      setAccessToken(token);
      fetchDigitalHumans();
      fetchUserCredits();  // ✅ 添加这一行
      fetchPresetAvatars();
      fetchTtsVoices();
      loadHistory();  // 加载历史记录
      
    }
    
    // 组件卸载时清理音频资源
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
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
      await loadHistory();
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
      Linking.openURL(payUrl);
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
      Linking.openURL(payUrl);
    } else {
      Linking.openURL(payUrl);
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

        const { pay_url, qr_code, channel, out_trade_no } = res.data;

        setShowRechargeModal(false);
        setPendingOrderId(out_trade_no || '');
        setPaymentLink('');
        setPaymentQRCode('');
        setShowPaymentModal(false);

        // ＝＝＝ 核心修改：优先跳转，移动端用 pay_url，桌面端用 qr_code ＝＝＝
        if (pay_url) {
          Linking.openURL(pay_url);
          return;
        }

        // 只有在没有 pay_url 的情况下，才展示二维码
        if (qr_code) {
          setPaymentQRCode(qr_code);
          setShowPaymentModal(true);
          return;
        }

        showToast('支付链接获取失败', true);
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
    // 获取预设形象列表
  const fetchPresetAvatars = async () => {
    try {
      // 先读缓存
      const cached = localStorage.getItem('preset_avatars');
      if (cached) {
        setPresetAvatars(JSON.parse(cached));
      }
      
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/preset-avatars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data) {
        setPresetAvatars(response.data);
        localStorage.setItem('preset_avatars', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('获取预设形象失败:', error);
    }
  };

  const fetchTtsVoices = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const officialResponse = await axios.get(`${API_URL}/tts/voices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const officialVoices = officialResponse.data || [];
      const manualVoices = MANUAL_VOICES;
      const manualNames = new Set(manualVoices.map(v => v.name));
      const filteredOfficial = officialVoices.filter(v => !manualNames.has(v.name));
      const allVoices = [...manualVoices, ...filteredOfficial];
      
      // 缓存
      localStorage.setItem('tts_voices', JSON.stringify(allVoices));
      setTtsVoices(allVoices);

      if (allVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(allVoices[0].id);
        setDigitalVoice(allVoices[0].name);
      }
    } catch (error) {
      // 网络失败时用缓存
      const cached = localStorage.getItem('tts_voices');
      if (cached) {
        setTtsVoices(JSON.parse(cached));
      } else {
        setTtsVoices(MANUAL_VOICES);
      }
    }
  };
    // 试听音色
  const playVoicePreview = async (voiceId, previewUrl) => {
    if (!previewUrl) {
      console.log('无预览链接');
      return;
    }
    
    if (!Audio || !Audio.Sound) {
      console.error('Audio 模块未正确加载');
      return;
    }
    
    // 如果正在播放同一个音色，则停止
    if (playingVoiceId === voiceId) {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('停止播放出错:', e);
        }
        soundRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }
    
    // 停止当前播放的
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('停止播放出错:', e);
      }
      soundRef.current = null;
    }
    
    // 播放新的
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingVoiceId(voiceId);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingVoiceId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error('播放失败:', error);
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

  // 保存历史记录（改为调用后端API）
  const saveToHistory = async (url, type, thumbnail = null) => {
    console.trace('saveToHistory 被调用:', type, url);
    if (!url) return;
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast('请先登录', true);
      return;
    }
    
    try {
      await axios.post(`${API_URL}/history/save`, {
        url: url,
        type: type,
        thumbnail: thumbnail
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      await loadHistory();
      showToast(`${type} 已保存到历史记录`);
    } catch (error) {
      console.error('保存历史记录失败:', error, error.response?.data);
      showToast('保存失败', true);
    }
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
  // 从后端加载历史记录
  const loadHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setHistory([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/history/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.code === 200) {
        const items = response.data.data.map(item => ({
          id: item.id,
          url: item.url,
          type: item.type,
          thumbnail: item.thumbnail,
          timestamp: new Date(item.timestamp).toLocaleString()
        }));
        // 去重
        const uniqueItems = items.filter((item, index, self) =>
          index === self.findIndex(t => t.url === item.url && t.type === item.type)
        );
        setHistory(uniqueItems);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
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
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
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

  const pickEcommerceImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setEcommerceImage(res.assets[0]);
      }
    });
  };

  const pickEcommerceDigitalImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets[0]) {
        setEcommerceDigitalImage(res.assets[0]);
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
    // 实名认证检查
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (!checkAndUseCredits(2, '尺码推荐', () => {})) return;
    if (!selectedImage) return showToast('请先选择一张照片');
    setSizeLoading(true);
  
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
      setSizeLoading(false);
    }
  };

  const generateImage = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (!selectedImage) return showToast('请先选择一张参考图片');
    setimageLoading(true);
    setIsGenerating(true);
    setGeneratingTitle('AI正在生成图片');
    setGeneratingSubtitle('文生图 / 图生图');
  
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
      setimageLoading(false);
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    const cost = duration === 5 ? 10 : 15;
    if (!selectedImage) return showToast('请先选择一张图片');
    setVideoLoading(true);
    setIsGenerating(true);
    setGeneratingTitle('AI正在生成视频');
    setGeneratingSubtitle('图生视频动态展示');
  
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
      setVideoLoading(false);
      setIsGenerating(false);
    }
  };

  const generateTryon = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (clothCategory !== 'lower' && clothCategory !== 'dress' && !modelImage) return showToast('请先选择模特图片');
    if (!garmentImage) return showToast('请先选择服装图片');
    if (clothCategory === 'dress') {
      Alert.alert(
        '套装/连衣裙',
        '如果是单件连衣裙，请直接上传。\n如果是上下装套装，请将上装和下装白底图错开排版到一张图后上传。',
        [
          { text: '我已按要求上传', onPress: () => {} },
          { text: '取消', onPress: () => { tryonLoading(false); setIsGenerating(false); return; } }
        ]
      );
    }
    settryonLoading(true);
    setIsGenerating(true);
    setGeneratingTitle('AI正在生成试穿视频');
    setGeneratingSubtitle('服装上身效果展示');
  
    const formData = new FormData();
    // 如果是下装，下载专用模特图作为文件
    let modelFile;
    if (clothCategory === 'lower') {
      const LOWER_MODEL_URL = "https://media.lingjing-media.com/%E5%AE%B6%E9%A6%A8.png";
      const response = await fetch(LOWER_MODEL_URL);
      const blob = await response.blob();
      modelFile = new File([blob], 'lower_model.jpg', { type: 'image/jpeg' });
    } else if (clothCategory === 'dress') {
      const DRESS_MODEL_URL = "https://media.lingjing-media.com/%E5%AE%B6%E9%A6%A8.png";
      const response = await fetch(DRESS_MODEL_URL);
      const blob = await response.blob();
      modelFile = new File([blob], 'dress_model.jpg', { type: 'image/jpeg' });
    } else {
      modelFile = await convertToFile(modelImage);
    }
    const modelExt = modelFile.name?.split('.').pop() || 'jpg';
    const safeModel = new File([modelFile], `model_${Date.now()}.${modelExt}`, { type: modelFile.type });
    formData.append('model_image', safeModel);
  
    const garmentFile = await convertToFile(garmentImage);
    const garmentExt = garmentFile.name?.split('.').pop() || 'jpg';
    const safeGarment = new File([garmentFile], `garment_${Date.now()}.${garmentExt}`, { type: garmentFile.type });
    formData.append('garment_image', safeGarment);
    formData.append('cloth_category', clothCategory);

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
      settryonLoading(false);
      setIsGenerating(false);
    }
  };

  const generateDigitalHuman = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (!digitalImage) return showToast('请先上传照片');
    if (!digitalText.trim()) return showToast('请输入说话内容');
    setDigitalLoading(true);
    setIsGenerating(true);
    setGeneratingTitle('AI正在生成数字人视频');
    setGeneratingSubtitle('虚拟形象口播讲解');

    try {
      const token = localStorage.getItem('access_token');
      let response;

      // 判断 digitalImage 是 URL 还是本地文件
      const isUrl = typeof digitalImage === 'string' || digitalImage.isUrl || (digitalImage.uri && digitalImage.uri.startsWith('http'));

      if (isUrl) {
        // 形象库图片：用 FormData 发送 URL
        const imageUrl = digitalImage.uri;
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('text', digitalText);
        formData.append('voice', digitalVoice);
        if (digitalName) formData.append('name', digitalName);

        response = await fetch(`${API_URL}/digital-human/generate`, {
          method: 'POST',
          headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
          body: formData
        });
      } else {
        // 手动上传的图片：使用 FormData
        const formData = new FormData();
        const imageFile = await convertToFile(digitalImage);
        const ext = imageFile.name?.split('.').pop() || 'jpg';
        const safeImage = new File([imageFile], `digital_${Date.now()}.${ext}`, { type: imageFile.type });
        formData.append('image', safeImage);
        formData.append('text', digitalText);
        formData.append('voice', digitalVoice);
        if (digitalName) formData.append('name', digitalName);

        response = await fetch(`${API_URL}/digital-human/generate`, {
          method: 'POST',
          headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
          body: formData,
        });
      }

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
      setDigitalLoading(false);
      setIsGenerating(false);
    }
  };

  const generateDigitalHumanCustom = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (!checkAndUseCredits(10, '定制数字人', () => {})) return;
    if (!customVideo) return showToast('请先上传训练视频');
    if (!customName.trim()) return showToast('请输入数字人名称');
    setEcommerceLoading(true);

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
      setEcommerceLoading(false);
    }
  };

  // ========== AI带货视频相关函数（替换版） ==========

    // 解析抖音链接 - 终极硬编码版本
    const fetchProductInfo = async () => {
      const isVerified = await checkPhoneVerified();
      if (!isVerified) {
        showToast('根据法规要求，使用AI功能前需完成手机号认证');
        setShowLoginModal(true);
        return;
      }
      
      if (!ecommerceUrl.trim()) {
        showToast('请输入商品链接', true);
        return;
      }
      
      setEcommerceLoading(true);
      try {
        const token = accessToken;
        if (!token) {
          showToast('请先登录', true);
          return;
        }

      const BACKEND_URL = 'https://lingjing.preview.aliyun-zeabur.cn/api';

      const res = await axios.post(
        `${BACKEND_URL}/ecommerce/parse_url`,
        { url: ecommerceUrl },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (res.data.code === 200) {
        const productData = res.data.data;
        
        // 自动填充商品描述
        setEcommerceDescription(productData.description || productData.title);
        
        // ✅ 自动设置商品图片
        if (productData.images && productData.images.length > 0) {
          setEcommerceImage({ uri: productData.images[0], isUrl: true });
          showToast(`解析成功，正在自动生成带货视频...`);
          // ✅ 关键：自动触发生成
          setTimeout(() => {
            generateEcommerceVideo();
          }, 500);
        } else {
          setEcommerceImage(null);
          showToast(`解析成功，请手动上传商品图片`);
        }
      } else {
        showToast(res.data.message || '解析失败', true);
      }
    } catch (err) {
      console.error('解析失败:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || '解析失败，请手动填写';
      showToast(errorMsg, true);
    } finally {
      setEcommerceLoading(false);
    }
  };

  // 生成带货视频 - 异步后台版本
    const generateEcommerceVideo = async () => {
      const isVerified = await checkPhoneVerified();
      if (!isVerified) {
        showToast('根据法规要求，使用AI功能前需完成手机号认证');
        setShowLoginModal(true);
        return;
      }
      
      const BACKEND_URL = 'https://lingjing.preview.aliyun-zeabur.cn/api';
      
      if (!ecommerceImage && !ecommerceDescription.trim()) {
        showToast('请上传商品图片或填写描述', true);
        return;
      }
    
    // 套装确认弹窗
    if (clothCategory === 'dress' && Platform.OS === 'web') {
      const confirmed = window.confirm(
        '套装/连衣裙上传须知：\n\n' +
        '• 单件连衣裙 → 直接上传白底图即可\n\n' +
        '• 上下装套装 → 请将上装和下装的白底图错开排版到一张图里（中间留空隙，不要连在一起）\n\n' +
        '点击"确定"继续生成，点击"取消"返回修改'
      );
      if (!confirmed) {
        setIsGenerating(false);
        return;
      }
    }
    
    setIsGenerating(true);
    setGeneratingTitle('AI正在制作带货视频');
    setGeneratingSubtitle('数字人讲解 + 商品展示');
    setEcommerceVideoUrl('');
    
    try {
      let productImageUrl = null;
      
      // 处理商品图片
      if (ecommerceImage) {
        if (ecommerceImage.isUrl || ecommerceImage.uri?.startsWith('http')) {
          productImageUrl = ecommerceImage.uri;
        } else if (ecommerceImage.uri) {
          const formData = new FormData();
          const file = await convertToFile(ecommerceImage);
          formData.append('file', file);
          const uploadRes = await axios.post(`${BACKEND_URL}/upload/`, formData, {
            headers: { 
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${accessToken}`
            }
          });
          productImageUrl = uploadRes.data.url;
        }
      }
      
      let digitalImageUrl = null;
      if (ecommerceDigitalImage) {
        if (ecommerceDigitalImage.uri?.startsWith('http')) {
          digitalImageUrl = ecommerceDigitalImage.uri;
        } else if (ecommerceDigitalImage.uri) {
          const formData = new FormData();
          const file = await convertToFile(ecommerceDigitalImage);
          formData.append('file', file);
          const uploadRes = await axios.post(`${BACKEND_URL}/upload/`, formData, {
            headers: { 
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${accessToken}`
            }
          });
          digitalImageUrl = uploadRes.data.url;
        }
      }
      
      // 提交异步任务
      const res = await axios.post(`${BACKEND_URL}/ecommerce/generate_video`, {
        url: ecommerceUrl || undefined,
        description: ecommerceDescription,
        image_url: productImageUrl,
        digital_image_url: digitalImageUrl,
        cloth_category: clothCategory || '',
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` } 
      });
      
      if (res.data.code === 200) {
        const taskId = res.data.data?.task_id;
        if (taskId) {
          startPollingTask(taskId, 'AI带货视频', `${BACKEND_URL}/ecommerce/task/${taskId}`);
        } else {
          const videoUrl = res.data.data?.video_url;
          if (videoUrl) {
            setEcommerceVideoUrl(videoUrl);
            showToast('视频生成成功');
            saveToHistory(videoUrl, 'AI带货视频');
          }
          setIsGenerating(false);
        }
      } else {
        showToast(res.data.message || '生成失败', true);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('生成带货视频失败:', err);
      showToast(err.response?.data?.detail || '生成失败', true);
      setIsGenerating(false);
    }
  };

  // 通用后台轮询：完成后自动保存历史记录
  const startPollingTask = (taskId, type, queryUrl) => {
    const BACKEND_URL = 'https://lingjing.preview.aliyun-zeabur.cn/api';
    let attempts = 0;
    const maxAttempts = 60;
    
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { clearInterval(pollingRef.current); setIsGenerating(false); return; }
        
        const statusRes = await axios.get(queryUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const task = statusRes.data.data;
        if (!task) return;
        
        if (task.status === 'completed') {
          clearInterval(pollingRef.current);
          setIsGenerating(false);
          const videoUrl = task.video_url || task.output_data?.video_url;
          const thumbnail = task.thumbnail || null;
          if (videoUrl) {
            saveToHistory(videoUrl, type, thumbnail);
            showToast(`🎉 ${type}生成成功！`);
            await loadHistory();
          }
        } else if (task.status === 'failed') {
          clearInterval(pollingRef.current);
          setIsGenerating(false);
          showToast(`${type}生成失败: ${task.message || '请重试'}`, true);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current);
          setIsGenerating(false);
          showToast('生成超时，请稍后在历史记录中查看', true);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(pollingRef.current);
          setIsGenerating(false);
        }
      }
    }, 10000); // 每10秒查一次

    // 保存引用以便清除
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  };


  // 保存视频到相册（新增）
  const handleSaveEcommerceVideo = async () => {
    if (!ecommerceVideoUrl) {
      showToast('没有可保存的视频', true);
      return;
    }
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请允许保存到相册');
        return;
      }
      
      const filename = `lingjing_ecommerce_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;
      const download = FileSystem.createDownloadResumable(ecommerceVideoUrl, fileUri);
      const { uri } = await download.downloadAsync();
      
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('视频已保存到相册');
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败，请重试', true);
    }
  };

  const generateMultiAngle = async () => {
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    if (multiImages.length < 2) {
      showToast('请至少上传2张不同角度的照片', true);
      return;
    }
    if (multiImages.length > 4) {
      showToast('最多上传4张照片', true);
      return;
    }
      
      setIsGenerating(true);
      setGeneratingTitle('AI正在生成多角度视频');
      setGeneratingSubtitle('多角度动态展示');
    
      try {
        const formData = new FormData();
        
        // 添加所有图片
        for (let i = 0; i < multiImages.length; i++) {
          const file = await convertToFile(multiImages[i]);
          const ext = file.name?.split('.').pop() || 'jpg';
          const safeFile = new File([file], `multi_${Date.now()}_${i}.${ext}`, { type: file.type });
          formData.append('images', safeFile);
        }
        
        // 添加描述
        formData.append('description', '展示服装多角度细节');
        
        const token = localStorage.getItem('access_token');
        
        // ✅ 修正：调用正确的后端接口路径
        const response = await fetch(`${API_URL}/multi-angle/generate`, {
          method: 'POST',
          headers: { 
            'Authorization': token ? `Bearer ${token}` : '' 
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '多角度合成失败');
        }

        const res = await response.json();
        console.log('多角度合成响应:', res);
      
        // ✅ 修正：后端返回 video_url，不是 image_url
        const videoUrl = res.data?.video_url;
      
        if (!videoUrl) {
          console.error('无法提取视频 URL:', res);
          showToast('多角度合成成功，但无法获取视频链接', true);
          return;
        }
      
        // 显示结果视频
        setCurrentVideoUrl(videoUrl);
        setVideoModalVisible(true);
        saveToHistory(videoUrl, '多角度试穿');
        showToast('多角度视频生成成功');
        
      } catch (err) {
        console.error('多角度合成错误:', err);
        showToast(err.message || '合成失败', true);
      } finally {
        setIsGenerating(false);
      }
    };

const handleGenerate = () => {
      switch (activeTab) {
        case 'size': recommendSize(); break;
        case 'image': generateImage(); break;
        case 'video': generateVideo(); break;
        case 'tryon': generateTryon(); break;
        case 'multi': generateMultiAngle(); break;  // ✅ 新增多角度
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
          <View style={{ position: 'relative', width: '100%' }}>
            {videoUrl && (
              <Video
                source={{ uri: videoUrl }}
                style={styles.resultVideo}
                resizeMode="contain"
                useNativeControls
                isMuted={false}
                onError={(e) => console.log('视频播放错误', e)}
              />
            )}
            <View style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>AI生成</Text>
            </View>
          </View>
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

    return null;
  };

  const tabs = [
    { key: 'size', icon: 'body-outline', label: '尺码', color: '#7c3aed' },
    { key: 'image', icon: 'image-outline', label: '图片', color: '#10b981' },
    { key: 'video', icon: 'videocam-outline', label: '视频', color: '#f59e0b' },
    { key: 'tryon', icon: 'shirt-outline', label: '试穿', color: '#ef4444' },
    { key: 'digital', icon: 'person-circle-outline', label: '数字人', color: '#06b6d4' },
    { key: 'digital_custom', icon: 'videocam-outline', label: '定制视频', color: '#f97316' },
    { key: 'multi', icon: 'albums-outline', label: '多角度', color: '#8b5cf6' },
    { key: 'profile', icon: 'person-outline', label: '我的', color: '#7c3aed' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} maxFontSizeMultiplier={1}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>灵境AI</Text>
        </View>

        <View style={styles.tabContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => {
                if (activeTab !== tab.key) {
                  setSelectedImage(null);
                  setResult(null);
                  setModelImage(null);
                  setGarmentImage(null);
                  setDigitalImage(null);
                }
                setActiveTab(tab.key);
              }}
            >
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
                    <View style={{ width: '100%', height: 200, position: 'relative' }}>
                      <Image
                        key={selectedImage?.uri}
                        source={{ uri: selectedImage?.uri }}
                        style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                      />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.overlayText}>点击更换</Text>
                      </View>
                    </View>
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
                {(clothCategory === 'lower' || clothCategory === 'dress') ? (
                  <Card style={styles.imageCard}>
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Icon name="information-circle-outline" size={48} color="#FF4757" />
                      <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>
                        {clothCategory === 'lower' ? '下装试穿将使用系统默认模特图' : '套装/连衣裙将使用系统指定模特图'}
                      </Text>
                      <Text style={{ color: '#666', marginTop: 5, textAlign: 'center' }}>
                        请直接上传服装图片，点击生成即可
                      </Text>
                    </View>
                  </Card>
                ) : (
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
                        <TouchableOpacity 
                          onPress={() => {
                            setPreviewUrl(modelImage.uri);
                            setModalVisible(true);
                          }}
                        >
                          <Image
                            key={selectedImage?.uri}
                            source={{ uri: modelImage?.uri }}
                            style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                          />
                        </TouchableOpacity>
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
                )}
                
                {/* 服装类型选择 */}
                <Card style={styles.imageCard}>
                  <Text style={styles.cardTitle}>📦 服装类型</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
                    {['other', 'dress', 'lower'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setClothCategory(cat)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 20,
                          borderRadius: 20,
                          backgroundColor: clothCategory === cat ? '#FF4757' : '#f0f0f0',
                        }}
                      >
                        <Text style={{
                          color: clothCategory === cat ? '#fff' : '#333',
                          fontWeight: 'bold',
                        }}>
                          {cat === 'other' ? '其他服装' : cat === 'dress' ? '套装/连衣裙' : '下身服装'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(clothCategory === 'dress' || clothCategory === 'lower') && (
                    <View style={{ padding: 10, backgroundColor: '#FFF3F3', borderRadius: 10, marginTop: 5 }}>
                      <Text style={{ color: '#FF4757', textAlign: 'center', fontWeight: 'bold' }}>
                        {clothCategory === 'lower' ? '📌 下身服装使用默认模特，请直接上传服装图' : '📌 套装/连衣裙使用指定模特，请直接上传服装图'}
                      </Text>
                    </View>
                  )}
                </Card>
                
                {/* 服装图片上传提示 */}
                {clothCategory === 'dress' && (
                  <Card style={styles.uploadTips}>
                    <Text style={styles.tipsTitle}>📌 套装上传要求：</Text>
                    <Text style={styles.tipsText}>• 单件连衣裙：上传白底商品图即可</Text>
                    <Text style={styles.tipsText}>• 上下装套装：需将上装和下装的白底图错开排版到一张图里，中间留空隙（不要连在一起）</Text>
                    <Text style={styles.tipsText}>• 支持 .jpg / .jpeg / .png 格式</Text>
                    <Text style={styles.tipsText}>• 文件大小不超过 10MB</Text>
                  </Card>
                )}
                
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
                        <TouchableOpacity 
                          onPress={() => {
                            setPreviewUrl(garmentImage.uri);
                            setModalVisible(true);
                          }}
                        >
                          <Image
                            key={selectedImage?.uri}
                            source={{ uri: garmentImage?.uri }}
                            style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                          />
                        </TouchableOpacity>
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
                {/* ========== 新增：形象分类筛选 ========== */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity 
                    style={[styles.categoryChip, avatarCategory === 'all' && styles.categoryChipActive]}
                    onPress={() => setAvatarCategory('all')}
                  >
                    <Text style={[styles.categoryChipText, avatarCategory === 'all' && styles.categoryChipTextActive]}>全部</Text>
                  </TouchableOpacity>
                  {[...new Set(presetAvatars.map(a => a.category))].map(cat => (
                    <TouchableOpacity 
                      key={cat}
                      style={[styles.categoryChip, avatarCategory === cat && styles.categoryChipActive]}
                      onPress={() => setAvatarCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, avatarCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* ========== 新增：预设形象横向滚动列表 ========== */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                  {presetAvatars
                    .filter(avatar => avatarCategory === 'all' || avatar.category === avatarCategory)
                    .map(avatar => (
                      <TouchableOpacity
                        key={avatar.id}
                        style={[styles.avatarCard, selectedAvatarId === avatar.id && styles.avatarCardActive]}
                        onPress={() => {
                          // 如果有预览视频，先播放视频预览
                          if (avatar.preview_video_url) {
                            setCurrentPreviewVideoUrl(avatar.preview_video_url);
                            setPreviewVideoVisible(true);
                          } else {
                            // 没有视频则直接选中形象
                            setSelectedAvatarId(avatar.id);
                            setDigitalImage({ uri: avatar.model_image, isUrl: true });
                          }
                        }}
                      >
                        <Image source={{ uri: avatar.preview_image }} style={styles.avatarImage} />
                        <Text style={styles.avatarName}>{avatar.name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 原有的上传照片卡片 */}
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
                      <View style={{ width: '100%', height: 200, position: 'relative' }}>
                        <Image
                          key={digitalImage?.uri}
                          source={{ uri: digitalImage?.uri }}
                          style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                        />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.placeholder}>
                        <Icon name="person-outline" size={48} color="#666" />
                        <Text style={styles.placeholderText}>点击上传照片</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Card>

                {/* 输入说话内容 */}
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

                {/* 选择音色 */}
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>🎵 选择音色</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {ttsVoices.length > 0 ? (
                      ttsVoices.map(voice => (
                        <View key={voice.id} style={styles.voiceItemWrapper}>
                          <TouchableOpacity
                            style={styles.voiceItem}
                            onPress={() => {
                              setSelectedVoiceId(voice.id);
                              setDigitalVoice(voice.name);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.voiceItemText, selectedVoiceId === voice.id && styles.voiceItemTextActive]}>
                              {voice.name}
                            </Text>
                          </TouchableOpacity>
                          {voice.preview_url && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                playVoicePreview(voice.id, voice.preview_url);
                              }}
                              style={styles.voicePlayButton}
                              activeOpacity={0.7}
                            >
                              <Icon 
                                name={playingVoiceId === voice.id ? "pause-circle" : "play-circle"} 
                                size={24} 
                                color="#7c3aed" 
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={styles.loadingVoices}>
                        <ActivityIndicator size="small" color="#7c3aed" />
                        <Text style={styles.loadingVoicesText}>加载音色中...</Text>
                      </View>
                    )}
                  </ScrollView>
                </Card>

                {/* 数字人名称（可选） */}
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

                {/* 生成按钮 */}
                <TouchableOpacity onPress={generateDigitalHuman} disabled={digitalLoading} style={styles.generateButton}>
                  {digitalLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>生成数字人视频</Text>}
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'digital_custom' && (
              <>
                {/* 子标签栏 */}
                <View style={styles.subTabContainer}>
                  <TouchableOpacity
                    style={[styles.subTab, digitalSubTab === 'avatar' && styles.activeSubTab]}
                    onPress={() => setDigitalSubTab('avatar')}
                  >
                    <Text style={[styles.subTabText, digitalSubTab === 'avatar' && styles.activeSubTabText]}>数字人分身</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subTab, digitalSubTab === 'custom' && styles.activeSubTab]}
                    onPress={() => setDigitalSubTab('custom')}
                  >
                    <Text style={[styles.subTabText, digitalSubTab === 'custom' && styles.activeSubTabText]}>定制数字人</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subTab, digitalSubTab === 'ecommerce' && styles.activeSubTab]}
                    onPress={() => setDigitalSubTab('ecommerce')}
                  >
                    <Text style={[styles.subTabText, digitalSubTab === 'ecommerce' && styles.activeSubTabText]}>AI带货视频</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                  {/* ========== 子标签1：数字人分身 ========== */}
                  {digitalSubTab === 'avatar' && (
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
                            <View style={{ width: '100%', height: 200, position: 'relative' }}>
                              <Image
                                key={digitalImage?.uri}
                                source={{ uri: digitalImage?.uri }}
                                style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                              />
                              <View style={styles.imageOverlay}>
                                <Text style={styles.overlayText}>点击更换</Text>
                              </View>
                            </View>
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {ttsVoices.length > 0 ? (
                            ttsVoices.map(voice => (
                              <View key={voice.id} style={styles.voiceItemWrapper}>
                                <TouchableOpacity
                                  style={styles.voiceItem}
                                  onPress={() => {
                                    setSelectedVoiceId(voice.id);
                                    setDigitalVoice(voice.name);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.voiceItemText, selectedVoiceId === voice.id && styles.voiceItemTextActive]}>
                                    {voice.name}
                                  </Text>
                                </TouchableOpacity>
                                {voice.preview_url && (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      playVoicePreview(voice.id, voice.preview_url);
                                    }}
                                    style={styles.voicePlayButton}
                                    activeOpacity={0.7}
                                  >
                                    <Icon 
                                      name={playingVoiceId === voice.id ? "pause-circle" : "play-circle"} 
                                      size={24} 
                                      color="#7c3aed" 
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))
                          ) : (
                            <View style={styles.loadingVoices}>
                              <ActivityIndicator size="small" color="#7c3aed" />
                              <Text style={styles.loadingVoicesText}>加载音色中...</Text>
                            </View>
                          )}
                        </ScrollView>
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

                      <TouchableOpacity onPress={generateDigitalHuman} disabled={digitalLoading} style={styles.generateButton}>
                        {digitalLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>生成数字人视频</Text>}
                      </TouchableOpacity>
                    </>
                  )}


                  {/* ========== 子标签2：定制数字人 ========== */}
                  {digitalSubTab === 'custom' && (
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

                      <TouchableOpacity onPress={generateDigitalHumanCustom} disabled={customLoading} style={styles.generateButton}>
                        {customLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始定制数字人</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ========== 子标签3：AI带货视频 ========== */}
                  {digitalSubTab === 'ecommerce' && (
                    <Card style={styles.card}>
                      <Text style={styles.cardTitle}>🚀 AI 带货视频</Text>
                      
                      {/* 商品链接（必填） */}
                      <Text style={styles.label}>抖音商品链接</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="粘贴抖音商品链接"
                        placeholderTextColor="#888"
                        value={ecommerceUrl}
                        onChangeText={setEcommerceUrl}
                      />
                      
                      {/* 解析按钮 */}
                      <TouchableOpacity
                        style={[styles.parseButton, ecommerceLoading && styles.disabledButton]}
                        onPress={fetchProductInfo}
                        disabled={ecommerceLoading}
                      >
                        {ecommerceLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.parseButtonText}>解析链接</Text>
                        )}
                      </TouchableOpacity>
                      
                      <View style={styles.divider} />
                      
                      {/* 服装类型选择 */}
                      <Card style={styles.imageCard}>
                        <Text style={styles.cardTitle}>📦 服装类型</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
                          {['other', 'dress', 'lower'].map(cat => (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => setClothCategory(cat)}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 20,
                                borderRadius: 20,
                                backgroundColor: clothCategory === cat ? '#FF4757' : '#f0f0f0',
                              }}
                            >
                              <Text style={{
                                color: clothCategory === cat ? '#fff' : '#333',
                                fontWeight: 'bold',
                              }}>
                                {cat === 'other' ? '其他服装' : cat === 'dress' ? '套装/连衣裙' : '下身服装'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {(clothCategory === 'dress' || clothCategory === 'lower') && (
                          <View style={{ padding: 10, backgroundColor: '#FFF3F3', borderRadius: 10, marginTop: 5 }}>
                            <Text style={{ color: '#FF4757', textAlign: 'center', fontWeight: 'bold' }}>
                              {clothCategory === 'lower' ? '📌 下身服装使用默认模特，请直接上传服装图' : '📌 套装/连衣裙使用指定模特，请直接上传服装图'}
                            </Text>
                          </View>
                        )}
                      </Card>
                      {/* 服装图片上传提示 */}
                      {clothCategory === 'dress' && (
                        <Card style={styles.uploadTips}>
                          <Text style={styles.tipsTitle}>📌 套装上传要求：</Text>
                          <Text style={styles.tipsText}>• 单件连衣裙：上传白底商品图即可</Text>
                          <Text style={styles.tipsText}>• 上下装套装：需将上装和下装的白底图错开排版到一张图里，中间留空隙（不要连在一起）</Text>
                          <Text style={styles.tipsText}>• 支持 .jpg / .jpeg / .png 格式</Text>
                          <Text style={styles.tipsText}>• 文件大小不超过 10MB</Text>
                        </Card>
                      )}
                      
                      {/* ========== 修改：只在没有自动获取图片时显示上传区域 ========== */}
                      {(!ecommerceImage || (typeof ecommerceImage === 'object' && !ecommerceImage.uri?.startsWith('http'))) && (
                        <>
                          <View style={styles.cardHeader}>
                            <Text style={styles.label}>商品主图 *</Text>
                            {ecommerceImage && (
                              <TouchableOpacity onPress={() => setEcommerceImage(null)} style={styles.deleteButton}>
                                <Icon name="close-circle-outline" size={24} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                          <TouchableOpacity onPress={pickEcommerceImage} style={styles.imagePicker}>
                            {ecommerceImage ? (
                              <View style={{ width: '100%', height: 200, position: 'relative' }}>
                                <Image
                                  key={ecommerceImage?.uri}
                                  source={{ uri: ecommerceImage?.uri }}
                                  style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                                />
                                <View style={styles.imageOverlay}>
                                  <Text style={styles.overlayText}>点击更换</Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.placeholder}>
                                <Icon name="image-outline" size={48} color="#666" />
                                <Text style={styles.placeholderText}>点击上传商品图片</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                      
                      {/* ========== 修改：显示自动获取的图片（如果有） ========== */}
                      {ecommerceImage && typeof ecommerceImage === 'object' && ecommerceImage.uri?.startsWith('http') && (
                        <View style={styles.autoImageContainer}>
                          <View style={styles.cardHeader}>
                            <Text style={styles.label}>✓ 已自动获取商品图片</Text>
                            <TouchableOpacity onPress={() => setEcommerceImage(null)} style={styles.deleteButton}>
                              <Icon name="close-circle-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                          <View style={{ width: '100%', height: 200, position: 'relative' }}>
                            <Image
                              key={ecommerceImage?.uri}
                              source={{ uri: ecommerceImage?.uri }}
                              style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                            />
                          </View>
                        </View>
                      )}

                      {/* 数字人照片（下装/套装时隐藏） */}
                      {(clothCategory !== 'lower' && clothCategory !== 'dress') ? (
                        <>
                          <View style={styles.cardHeader}>
                            <Text style={styles.label}>数字人照片（可选）</Text>
                            {ecommerceDigitalImage && (
                              <TouchableOpacity onPress={() => setEcommerceDigitalImage(null)} style={styles.deleteButton}>
                                <Icon name="close-circle-outline" size={24} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                          <TouchableOpacity onPress={pickEcommerceDigitalImage} style={styles.imagePicker}>
                            {ecommerceDigitalImage ? (
                              <View style={{ width: '100%', height: 200, position: 'relative' }}>
                                <Image
                                  key={ecommerceDigitalImage?.uri}
                                  source={{ uri: ecommerceDigitalImage?.uri }}
                                  style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                                />
                                <View style={styles.imageOverlay}>
                                  <Text style={styles.overlayText}>点击更换</Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.placeholder}>
                                <Icon name="person-outline" size={48} color="#666" />
                                <Text style={styles.placeholderText}>点击上传数字人照片</Text>
                                <Text style={styles.hintText}>不传则使用默认形象</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={{ padding: 10, backgroundColor: '#FFF3F3', borderRadius: 10, marginBottom: 10 }}>
                          <Text style={{ color: '#FF4757', textAlign: 'center', fontWeight: 'bold' }}>
                            📌 下装已自动使用专用模特图，无需上传
                          </Text>
                        </View>
                      )}
                      
                      {/* 商品描述（可选，AI会自动生成） */}
                      <Text style={styles.label}>商品描述（可选，AI自动生成）</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 80 }]}
                        placeholder="可手动输入商品卖点，留空则由AI自动生成"
                        placeholderTextColor="#888"
                        value={ecommerceDescription}
                        onChangeText={setEcommerceDescription}
                        multiline
                      />
                      
                      {/* 生成按钮 - 只要有商品图片或描述就启用 */}
                      <TouchableOpacity
                        style={[styles.generateButton, (!ecommerceImage && !ecommerceDescription) && styles.disabledButton]}
                        onPress={generateEcommerceVideo}
                        disabled={isGenerating || (!ecommerceImage && !ecommerceDescription)}
                      >
                        {isGenerating ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.generateText}>生成带货视频</Text>
                        )}
                      </TouchableOpacity>
                      
                      {/* 视频结果 */}
                      {ecommerceVideoUrl ? (
                        <View style={{ marginTop: 16, position: 'relative' }}>
                          <Video
                            source={{ uri: ecommerceVideoUrl }}
                            style={styles.resultVideo}
                            useNativeControls
                            resizeMode="contain"
                          />
                          <View style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}>
                            <Text style={{ color: '#fff', fontSize: 12 }}>AI生成</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.saveVideoButton}
                            onPress={handleSaveEcommerceVideo}
                          >
                            <Text style={styles.saveVideoButtonText}>保存到相册</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </Card>
                  )}
                </ScrollView>
              </>
            )}

            {activeTab === 'multi' && (
              <Card style={styles.imageCard}>
                <Text style={styles.cardTitle}>🖼️ 上传多张照片（2-4张）</Text>
                <View style={styles.multiImageRow}>
                  {multiImages.map((img, idx) => (
                    <View key={idx} style={styles.multiImageItem}>
                      <TouchableOpacity 
                        onPress={() => {
                          setPreviewUrl(img.uri);
                          setModalVisible(true);
                        }}
                      >
                        {img?.uri && <Image
                          source={{ uri: img.uri }}
                          style={{ width: 80, height: 80, resizeMode: 'contain' }}
                        />}
                      </TouchableOpacity>
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

            {activeTab === 'size' && (
              <TouchableOpacity onPress={recommendSize} disabled={sizeLoading} style={styles.generateButton}>
                {sizeLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始尺码推荐</Text>}
              </TouchableOpacity>
            )}

            {activeTab === 'image' && (
              <TouchableOpacity onPress={generateImage} disabled={imageLoading} style={styles.generateButton}>
                {imageLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始生成图片</Text>}
              </TouchableOpacity>
            )}

            {activeTab === 'video' && (
              <TouchableOpacity onPress={generateVideo} disabled={videoLoading} style={styles.generateButton}>
                {videoLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始生成视频</Text>}
              </TouchableOpacity>
            )}

            {activeTab === 'tryon' && (
              <TouchableOpacity onPress={generateTryon} disabled={tryonLoading} style={styles.generateButton}>
                {tryonLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始虚拟试穿</Text>}
              </TouchableOpacity>
            )}

            {renderResult()}

            {history.length > 0 && (
              <Card style={styles.historyCard}>
                <Text style={styles.cardTitle}>📜 历史记录</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {history.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        if (item.type === '视频生成' || item.type === '虚拟试穿' || item.type === '数字人分身' || item.type === 'AI带货视频') {
                          setCurrentVideoUrl(item.url);
                          setVideoModalVisible(true);
                        } else if (item.type === '图片生成' || item.type === '多角度试穿') {
                          setSelectedImage(null);
                          setModelImage(null);
                          setGarmentImage(null);
                          setDigitalImage(null);
                          setResult({ images: [{ url: item.url }] });
                          setActiveTab(item.type === '图片生成' ? 'image' : 'multi');
                        } else {
                          setCurrentVideoUrl(item.url);
                          setVideoModalVisible(true);
                        }
                      }}
                      style={styles.historyItem}
                    >
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: item.thumbnail || item.url }}
                          style={styles.historyImage}
                          onError={(e) => {
                            if (e.nativeEvent?.error) {
                              // 加载失败，可以设置一个备用 source
                            }
                          }}
                        />
                        <View style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          borderRadius: 2,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>AI生成</Text>
                        </View>
                      </View>
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
                  <TouchableOpacity onPress={() => {
                    setShowSidebarMenu(false);
                    Linking.openURL('tencent://message/?uin=3060302415').catch(() => {
                      Linking.openURL('mailto:3060302415@qq.com');
                    });
                  }}>
                    <Text style={{ color: '#fff' }}>💬 帮助与客服</Text>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>QQ: 3060302415  电话: 15920978058</Text>
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

        {/* 隐私政策弹窗 */}
        <Modal visible={showPrivacyModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <Card style={styles.privacyCard}>
              <Text style={styles.privacyTitle}>欢迎使用灵境AI</Text>
              <Text style={styles.privacyContent}>
                感谢您信任并使用灵境AI！我们非常重视您的个人信息和隐私保护。
                在您开始使用前，请仔细阅读并同意以下协议：
              </Text>
              <View style={styles.privacyLinks}>
                <TouchableOpacity onPress={() => setShowPrivacyContent(true)}>
                  <Text style={styles.privacyLink}>《隐私政策》</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTermsContent(true)}>
                  <Text style={styles.privacyLink}>《用户服务协议》</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.privacyButtons}>
                <TouchableOpacity 
                  style={styles.privacyDisagreeBtn}
                  onPress={() => {
                    showToast('需同意协议才能使用本应用');
                  }}
                >
                  <Text style={styles.privacyDisagreeText}>不同意</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.privacyAgreeBtn}
                  onPress={() => {
                    localStorage.setItem('privacy_agreed', 'true');
                    setShowPrivacyModal(false);
                  }}
                >
                  <Text style={styles.privacyAgreeText}>同意并继续</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </Modal>

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
              {/* 支付宝支付二维码 */}
              {!!paymentQRCode && (
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentQRCode)}` }}
                  style={{ width: 280, height: 280, borderRadius: 16, marginBottom: 16 }}
                  onError={(e) => {
                    console.error('二维码生成失败，原始URL:', paymentQRCode);
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
        {/* ========== 通用生成进度弹窗 ========== */}
        {isGenerating && (
          <View style={styles.generatingOverlay}>
            <View style={styles.generatingBox}>
              <ActivityIndicator size="large" color="#FF4757" />
              <Text style={styles.generatingTitle}>🎬 {generatingTitle}</Text>
              <Text style={styles.generatingTips}>• {generatingSubtitle}</Text>
              <Text style={styles.generatingTips}>• 预计需要 2-5 分钟</Text>
              <Text style={styles.generatingTips}>• 若需离开，请点击下方按钮</Text>
              <Text style={styles.generatingTips}>• 视频完成后自动刷新历史记录</Text>
              <TouchableOpacity 
                style={styles.generatingCancelBtn}
                onPress={() => {
                  setIsGenerating(false);
                  showToast('已切换后台生成，完成后自动保存至历史记录');
                }}
              >
                <Text style={styles.generatingCancelText}>后台生成</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 全屏视频播放 Modal */}
        <Modal
          visible={videoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setVideoModalVisible(false)}
        >
          <View style={styles.videoModalContainer}>
            <TouchableOpacity
              style={styles.videoModalClose}
              onPress={() => setVideoModalVisible(false)}
            >
              <Icon name="close-circle-outline" size={40} color="#fff" />
            </TouchableOpacity>

            <Video
              ref={fullscreenVideoRef}
              source={{ uri: currentVideoUrl }}
              style={styles.fullscreenVideo}
              resizeMode="contain"
              useNativeControls={true}
              shouldPlay={true}
              onError={(e) => console.log('视频播放错误', e)}
            />

            {/* 标题栏 - 左上角 */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 50,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 10,
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>灵境AI</Text>
              <TouchableOpacity onPress={() => setVideoModalVisible(false)}>
                <Icon name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* AI生成 - 右下角，视频内部 */}
            <View style={{
              position: 'absolute',
              bottom: 20,
              right: 16,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 4,
              zIndex: 10,
            }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>AI生成</Text>
            </View>

          </View>
        </Modal>

        {/* 图片全屏预览 Modal */}
        <Modal visible={modalVisible} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalClose} 
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close-circle-outline" size={40} color="#fff" />
            </TouchableOpacity>
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
              />
            )}
          </View>
        </Modal>

        {/* 形象预览视频 Modal */}
        <Modal
          visible={previewVideoVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewVideoVisible(false)}
        >
          <View style={styles.videoPreviewModalContainer}>
            <TouchableOpacity
              style={styles.videoPreviewClose}
              onPress={() => setPreviewVideoVisible(false)}
            >
              <Icon name="close-circle-outline" size={40} color="#fff" />
            </TouchableOpacity>
            <Video
              source={{ uri: currentPreviewVideoUrl }}
              style={styles.videoPreviewPlayer}
              resizeMode="contain"
              useNativeControls
              shouldPlay={true}
              onError={(e) => console.log('预览视频播放错误', e)}
            />
            <TouchableOpacity
              style={styles.useThisAvatarButton}
              onPress={() => {
                const currentAvatar = presetAvatars.find(a => a.preview_video_url === currentPreviewVideoUrl);
                if (currentAvatar) {
                  setSelectedAvatarId(currentAvatar.id);
                  setDigitalImage({ uri: currentAvatar.model_image, isUrl: true });
                }
                setPreviewVideoVisible(false);
              }}
            >
              <Text style={styles.useThisAvatarButtonText}>使用此形象</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {toastVisible && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
        {/* 备案号 */}
        <View style={styles.beianContainer}>
          <Text style={styles.beianText}>
            <Text 
              onPress={() => Linking.openURL('https://beian.miit.gov.cn')}
              style={{ color: '#666', textDecoration: 'none' }}
            >
              粤ICP备2026044431号
            </Text>
          </Text>
        </View>

                {/* 隐私政策内容 Modal */}
        <Modal visible={showPrivacyContent} transparent={false} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ padding: 16 }}>
              <TouchableOpacity onPress={() => setShowPrivacyContent(false)} style={{ alignSelf: 'flex-end', padding: 8 }}>
                <Icon name="close-outline" size={28} color="#333" />
              </TouchableOpacity>
              <ScrollView>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>灵境AI隐私政策</Text>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>更新日期：2026年5月15日</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 12 }}>公司名称：广州速码智能信息有限公司</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 12 }}>注册地址：广东省广州市</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 20 }}>个人信息保护负责人：魏先生</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>一、我们如何收集和使用您的个人信息</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>我们仅在有合法性基础的情形下才会使用您的个人信息。根据适用的法律，我们可能会基于您的同意、为履行/订立您与我们的合同所必需、履行法定义务所必需等合法性基础，使用您的个人信息。您主动提供的信息包括：手机号（用于注册登录）、上传的图片/视频（用于AI生成服务）、身高数据（用于尺码推荐）。我们自动收集的信息包括：设备信息、日志信息。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>二、我们如何存储您的个人信息</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>您的个人信息存储于中国境内的服务器。存储期限为30天。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>三、我们如何保护您的个人信息</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>采用数据加密传输、访问权限控制、定期安全审查等措施保护您的信息安全。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>四、您的权利</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>您享有查阅权、更正权、删除权、撤回同意权。可通过以下方式联系我们行使权利。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>五、投诉渠道</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>电子邮件：3060302415@qq.com{'\n'}电话：15920978058</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>六、未成年人保护</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>本应用不面向未满14周岁的未成年人提供服务。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>七、联系我们</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>公司名称：广州速码智能信息有限公司{'\n'}电子邮件：3060302415@qq.com{'\n'}电话：15920978058</Text>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>

        {/* 用户服务协议内容 Modal */}
        <Modal visible={showTermsContent} transparent={false} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ padding: 16 }}>
              <TouchableOpacity onPress={() => setShowTermsContent(false)} style={{ alignSelf: 'flex-end', padding: 8 }}>
                <Icon name="close-outline" size={28} color="#333" />
              </TouchableOpacity>
              <ScrollView>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>灵境AI用户服务协议</Text>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>更新日期：2026年5月15日</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 12 }}>公司名称：广州速码智能信息有限公司</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 12 }}>注册地址：广东省广州市</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 20 }}>联系方式：3060302415@qq.com</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>一、服务条款的接受</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>用户在使用灵境AI提供的服务之前，应仔细阅读本协议。用户一旦使用灵境AI的服务，即表示同意接受本协议的全部条款。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>二、服务内容</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>灵境AI提供AI图片生成、视频生成、尺码推荐、虚拟试穿、数字人视频生成、AI带货视频生成等服务。部分服务需要消耗灵境点。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>三、用户账号</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>用户需通过手机号注册账号。用户对账号的安全负全部责任，不得将账号提供给第三方使用。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>四、使用规则</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>用户不得利用本平台从事违法活动，不得上传违法或侵权内容。用户上传的内容默认为用户拥有合法权利。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>五、知识产权</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>灵境AI平台的所有知识产权归广州速码智能信息有限公司所有。用户通过平台生成的AI内容，版权归用户所有。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>六、免责声明</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>灵境AI作为AI服务平台，不对生成内容的准确性、合法性承担责任。用户需自行判断生成内容的使用风险。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>七、协议修改</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>灵境AI有权随时修改本协议，修改后的协议在平台公示后生效。</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>八、联系我们</Text>
                <Text style={{ fontSize: 14, lineHeight: 24, marginBottom: 16 }}>公司名称：广州速码智能信息有限公司{'\n'}电子邮件：3060302415@qq.com{'\n'}电话：15920978058</Text>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>

      </View>   {/* 关闭 container */}
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
  historyCard: { marginTop: 10, minHeight: 250 },
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
    paddingBottom: 150,
    maxHeight: '80%',
    overflow: 'scroll',
    zIndex: 1000,
    maxHeight: '80%',       // 👈 新增，限制菜单最大高度
    overflowY: 'auto',      // 👈 新增，内容超出时允许滚动
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
  },
  subTabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1e1e2e',
    borderRadius: 30,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 25,
  },
  activeSubTab: {
    backgroundColor: '#7c3aed',
  },
  subTabText: {
    color: '#aaa',
    fontSize: 14,
  },
  activeSubTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  label: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: '#3b3b5c',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
  marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ========== AI带货视频相关样式 ==========
  parseButton: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  parseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2d2d44',
    marginVertical: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveVideoButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveVideoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  autoImageContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  autoPreviewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#2d2d44',
  },
  scrollableImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    overflow: 'hidden',
  },
  // 图片全屏预览 Modal 样式
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.7,
    resizeMode: 'contain',
  },
  // 视频全屏播放 Modal 样式
  videoModalContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  videoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  // ========== 形象选择器样式 ==========
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#7c3aed',
  },
  categoryChipText: {
    color: '#aaa',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  avatarScroll: {
    marginBottom: 16,
  },
  avatarCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#2d2d44',
  },
  avatarCardActive: {
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    objectFit: 'cover',
  },
  avatarName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  // 音色选择器样式
  voiceItemWrapper: {
    marginRight: 12,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  voiceItemActive: {
    backgroundColor: '#7c3aed',
  },
  voiceItemText: {
    color: '#aaa',
    fontSize: 14,
  },
  voiceItemTextActive: {
    color: '#fff',
  },
  voicePlayButton: {
    padding: 6,  // ← 只改这里
    marginLeft: 4,
  },
  loadingVoices: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  loadingVoicesText: {
    color: '#aaa',
    marginLeft: 8,
  },
    customBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  customBadgeText: {
    color: '#fff',
    fontSize: 10,
  },
    // 形象预览视频 Modal 样式
  videoPreviewModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  videoPreviewPlayer: {
    width: '90%',
    height: '60%',
  },
  useThisAvatarButton: {
    marginTop: 30,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
  },
  useThisAvatarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  beianContainer: {
    paddingVertical: 16,
    paddingBottom: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 0.5,
    borderTopColor: '#2d2d44',
  },
  beianText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  // 生成进度弹窗
  generatingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  generatingBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  generatingMsg: {
    fontSize: 14,
    color: '#FF4757',
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  generatingTips: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  generatingCancelBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  generatingCancelText: {
    color: '#666',
    fontSize: 14,
  },
  uploadTips: {
  backgroundColor: '#FFF9E6',
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
  },
  tipsTitle: {
    color: '#FF8C00',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tipsText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 20,
  },
    // 隐私弹窗样式
  privacyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  privacyContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  privacyLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  privacyLink: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 10,
    textDecorationLine: 'underline',
  },
  privacyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  privacyDisagreeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  privacyDisagreeText: {
    color: '#666',
    fontSize: 14,
  },
  privacyAgreeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#7c3aed',
  },
  privacyAgreeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
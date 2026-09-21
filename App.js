import 'formdata-polyfill';

import React, { useState, useEffect, useRef } from 'react';
import { MANUAL_VOICES } from './src/data/manualVoices.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { CapacitorWechat } from '@capgo/capacitor-wechat';

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
  Switch,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { Audio, Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height <= 2100;
const SCALE = isSmallScreen ? 0.72 : 1;
const S = (n) => n * SCALE;
const API_URL = 'https://api.lingjing-media.com/api';
const HISTORY_KEY = 'lingjing_image_history'; 

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// 检查是否已实名认证（已绑定手机号）
const checkPhoneVerified = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

const extractUrl = (text) => {
  // 先尝试提取 http/https 链接
  const httpMatch = text.match(/https?:\/\/[^\s]+/);
  if (httpMatch) return httpMatch[0];
  
  // 如果是 aweme:// 协议，尝试提取嵌套的 url 参数
  const awemeMatch = text.match(/url=(https?%3A%2F%2F[^&]+)/);
  if (awemeMatch) return decodeURIComponent(awemeMatch[1]);
  
  return text;
};

  const IAP_PRODUCTS = {
    1: 'com.lingjing_media.app.credits_100',
    2: 'com.lingjing_media.app.credits_350',
    3: 'com.lingjing_media.app.credits_900',
    4: 'com.lingjing_media.app.credits_2000',
  };


  // ========== 可灵预设形象（口播带货用） ==========
  const PRESET_AVATAR_IDS = [
    { id: 'avatar_vivian_female', name: 'Vivian（佳佳）', gender: '女', age: 23 },
    { id: 'avatar_lee_male', name: 'Lee（李阳）', gender: '男', age: 28 },
    { id: 'avatar_chenjing_female', name: '陈静', gender: '女', age: 30 },
    { id: 'avatar_zhaochen_male', name: '赵晨', gender: '男', age: 25 },
    { id: 'avatar_wanglei_male', name: '王磊', gender: '男', age: 45 },
    { id: 'avatar_eva_female', name: 'Eva', gender: '女', age: 18 },
    { id: 'avatar_oliver_male', name: 'Oliver', gender: '男', age: 30 },
    { id: 'avatar_elena_female', name: 'Elena', gender: '女', age: 30 },
    { id: 'avatar_adam_male', name: 'Adam', gender: '男', age: 25 },
    { id: 'avatar_anna_female', name: 'Anna', gender: '女', age: 25 },
    { id: 'avatar_rajput_male', name: 'Rajput', gender: '男', age: 40 },
    { id: 'avatar_mia_female', name: 'Mia', gender: '女', age: 28 },
    { id: 'avatar_river_male', name: 'River', gender: '男', age: 27 },
    { id: 'avatar_marcus_male', name: 'Marcus', gender: '男', age: 35 },
    { id: 'avatar_toto_cartoon', name: 'Toto（卡通）', gender: '男', age: 15 },
  ];

    // ========== 可灵预设音色（口播带货用） ==========
    const TALKING_VOICE_OPTIONS = [
      { id: 'male_calm_informative', name: '男声·沉稳科普' },
      { id: 'female_clear_rational', name: '女声·理性讲解' },
      { id: 'female_gentle_soothing', name: '女声·温柔治愈' },
      { id: 'female_bright_engaging', name: '女声·明亮带货' },
      { id: 'male_crisp_persuasive', name: '男声·利落种草' },
      { id: 'female_intelligent_narrative', name: '女声·知性叙事' },
      { id: 'male_clear_professional', name: '男声·清朗主持' },
      { id: 'male_energetic_sporty', name: '男声·清爽竞技' },
      { id: 'female_warm_rich', name: '女声·醇厚分享' },
    ];

    // ========== 口播带货价格 ==========
    const TALKING_AGENT_COST_PER_SECOND = 16;
    const TALKING_AGENT_MIN_SECONDS = 5;
    const TALKING_AGENT_WORDS_PER_SECOND = 4;

    // ========== 计算预估时长和费用 ==========
    const calcTalkingAgentCost = (script) => {
      const scriptLength = script.length;
      const estimatedSeconds = Math.max(
        TALKING_AGENT_MIN_SECONDS,
        Math.ceil(scriptLength / TALKING_AGENT_WORDS_PER_SECOND)
      );
      const estimatedCost = estimatedSeconds * TALKING_AGENT_COST_PER_SECOND;
      return { scriptLength, estimatedSeconds, estimatedCost };
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
    // ===== ✅ 新增：注册全局 Toast =====
    window.showToast = (message) => {
      // 使用您现有的 Toast 状态
      setToastMessage(message);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    };

    // 首次启动隐私弹窗
    if (!localStorage.getItem('privacy_agreed')) {
      setTimeout(() => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
          <div style="background:#1e1e2e;border-radius:16px;padding:24px;width:300px;text-align:center;">
            <div style="color:#fff;font-size:18px;margin-bottom:16px;">欢迎使用灵境AI</div>
            <div style="color:#aaa;font-size:13px;text-align:left;line-height:1.8;margin-bottom:20px;">
              请阅读并同意以下协议：<br>
              <a href="https://media.lingjing-media.com/privact.html" target="_blank" style="color:#7c3aed;">《隐私政策》</a><br>
              <a href="https://media.lingjing-media.com/terms.html" target="_blank" style="color:#7c3aed;">《用户协议》</a>
            </div>
            <div style="display:flex;gap:12px;">
              <button id="privacy-reject" style="flex:1;padding:10px;border-radius:8px;border:1px solid #666;background:transparent;color:#fff;">拒绝</button>
              <button id="privacy-agree" style="flex:1;padding:10px;border-radius:8px;border:none;background:#7c3aed;color:#fff;">同意</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        document.getElementById('privacy-agree').onclick = () => {
          localStorage.setItem('privacy_agreed', 'true');
          overlay.remove();
        };
        document.getElementById('privacy-reject').onclick = () => {
          overlay.remove();
        };
      }, 500);
    }
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const fullscreenVideoRef = useRef(null);

  // ========== 电商套图新状态 ==========
  const [suiteType, setSuiteType] = useState('scene');
  const [suiteSellingPoints, setSuiteSellingPoints] = useState('');
  const [suiteUsage, setSuiteUsage] = useState('');
  const [suiteRegion, setSuiteRegion] = useState('');
  const [suitePlatform, setSuitePlatform] = useState('');
  const [suiteSceneCount, setSuiteSceneCount] = useState(4);
  const [suiteAnalysis, setSuiteAnalysis] = useState(null);
  const [suiteResult, setSuiteResult] = useState(null);
  const [suiteLoading, setSuiteLoading] = useState(false);
  const [merchantImages, setMerchantImages] = useState([]);
  const [suiteAplusCount, setSuiteAplusCount] = useState(2);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState({ url: '', index: 0 });
  // ====================================
  // ========== 口播带货状态 ==========
  const [avatarMode, setAvatarMode] = useState('upload'); // 'upload' 或 'preset'
  const [talkingAvatarImage, setTalkingAvatarImage] = useState(null);
  const [talkingAvatarId, setTalkingAvatarId] = useState('');
  const [talkingVoiceId, setTalkingVoiceId] = useState('male_calm_informative');
  const [talkingProductImages, setTalkingProductImages] = useState([]);
  const [talkingGoodsTitle, setTalkingGoodsTitle] = useState('');
  const [talkingGoodsPrice, setTalkingGoodsPrice] = useState('');
  const [talkingTargetAudience, setTalkingTargetAudience] = useState('');
  const [talkingSellingPoint, setTalkingSellingPoint] = useState('');
  const [talkingScript, setTalkingScript] = useState('');
  const [talkingResolution, setTalkingResolution] = useState('720p');
  const [talkingAspectRatio, setTalkingAspectRatio] = useState('9:16');
  const [talkingAllowPolish, setTalkingAllowPolish] = useState(false);
  const [talkingBgmEnabled, setTalkingBgmEnabled] = useState(false);
  const [talkingLoading, setTalkingLoading] = useState(false);
  const [talkingEstimatedInfo, setTalkingEstimatedInfo] = useState(null); // 预估信息
  // ===================================

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
  const [parsingLoading, setParsingLoading] = useState(false);
  const [multiLoading, setMultiLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('image');
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
  const [videoModel, setVideoModel] = useState('2.6'); // '2.6' 或 '3.0'
  const [videoSound, setVideoSound] = useState('off'); // 'off' 或 'native'
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
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [userCredits, setUserCredits] = useState(() => {
    const saved = localStorage.getItem('user_credits');
    return saved ? parseInt(saved) : 0;
  });
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentQRCode, setPaymentQRCode] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [loginMode, setLoginMode] = useState('password');
  const [loginCode, setLoginCode] = useState('');
  const [digitalHumans, setDigitalHumans] = useState([]);
  const [showPayMethodModal, setShowPayMethodModal] = useState(false);
  const [pendingPkg, setPendingPkg] = useState(null);
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

  // 注册三步流程状态
  const [registerStep, setRegisterStep] = useState('phone'); // 'phone', 'code', 'password'
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [countdown, setCountdown] = useState(0);
  // 新增：登录验证码倒计时
  const [loginCountdown, setLoginCountdown] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState('');
  const [generatingSubtitle, setGeneratingSubtitle] = useState('');
  const pollingRef = useRef(null); // 轮询定时器引用
  // 新增：创建一个ref来稳定地保存验证码
  const savedRegisterCode = useRef('');

  const purchaseIAP = async (pkg) => {
    const productId = IAP_PRODUCTS[pkg.id];
    if (!productId) {
      showToast('商品ID不存在', true);
      return;
    }

    // 1. 支付
    let jws = '';
    try {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
      });
      console.log('IAP 交易:', JSON.stringify(transaction));
      jws = transaction.jwsRepresentation || '';
      if (!jws) {
        showToast('未获取到支付凭证', true);
        return;
      }
    } catch (err) {
      console.error('IAP 支付失败:', err);
      if (err.code === 'USER_CANCELLED' || err.message?.includes('cancel')) {
        showToast('已取消支付');
      } else {
        showToast('支付失败: ' + (err.message || '未知错误'), true);
      }
      return;
    }

    // 2. 后端验证 + 直接用返回的 credits 更新
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        showToast('请先登录', true);
        return;
      }
      const userId = JSON.parse(atob(token.split('.')[1])).sub;

      const res = await axios.post(`${API_URL}/payment/iap_verify`, {
        jws_representation: jws,
        package_id: pkg.id,
        credits: pkg.credits,
        user_id: userId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('后端返回:', res.data);

      // ✅ 直接用后端返回的 credits 更新
      if (res.data.code === 200 && res.data.credits !== undefined) {
        setUserCredits(res.data.credits);
        localStorage.setItem('user_credits', res.data.credits);
      }

      showToast(`充值成功 +${pkg.credits}灵境点`);
    } catch (apiErr) {
      console.error('后端验证失败:', apiErr.response?.data || apiErr.message);
      showToast('验证失败: ' + (apiErr.response?.data?.detail || apiErr.message), true);
    }
  };

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
      console.log('fetchUserCredits 完整响应:', JSON.stringify(res.data));
      
      // 兼容多种返回结构
      const newCredits = res.data?.data?.credits 
                      ?? res.data?.credits 
                      ?? res.data?.data?.data?.credits;
      
      if (newCredits === undefined || newCredits === null) {
        console.error('无法从响应中提取余额:', res.data);
        return;
      }
      
      console.log('获取到的余额:', newCredits);
      setUserCredits(newCredits);
      localStorage.setItem('user_credits', newCredits);
    } catch (err) {
      console.error('获取余额失败:', err.response?.data || err.message);
    }
  };

  useEffect(() => {
    // 恢复未完成的轮询任务
    const pending = localStorage.getItem('pending_task');
    if (pending) {
      const { taskId, type, queryUrl } = JSON.parse(pending);
      startPollingTask(taskId, type, queryUrl);
    }
        
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
      fetchUserCredits();
      fetchPresetAvatars();
      fetchTtsVoices();
      loadHistory();
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
    
    // 切换任何模块都停止音色
    if (soundRef.current) {
      try {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
      setPlayingVoiceId(null);
    }
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

  // 监听页面可见性，支付返回后自动刷新余额
  useEffect(() => {
    const refreshData = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        console.log('🔄 检测到页面返回，刷新余额');
        fetchUserCredits();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshData();
      }
    });

    window.addEventListener('focus', refreshData);

    return () => {
      document.removeEventListener('visibilitychange', refreshData);
      window.removeEventListener('focus', refreshData);
    };
  }, []);

  const handleLogin = async () => {
    if (!document.getElementById('loginAgree')?.checked) {
      showToast('请先阅读并同意隐私政策和用户协议', true);
      return;
    }
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


  const confirmDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API_URL}/auth/delete_account`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.clear();
      showToast('账户已注销');
      window.location.reload();
    } catch (err) {
      showToast('注销失败', true);
    }
    setShowDeleteConfirm(false);
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
            fetchUserCredits();
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
      // ========== iOS 走 IAP（不需要登录） ==========
      if (navigator.platform.indexOf('iPhone') !== -1 || navigator.platform.indexOf('iPad') !== -1) {
        await purchaseIAP(pkg);
        return;
      }
      // ========== 其他平台需要登录 ==========
      if (!accessToken) {
        showToast('请先登录', true);
        setShowRechargeModal(false);
        setShowLoginModal(true);
        return;
      }

      // ========== 打开支付方式选择弹窗 ==========
      setPendingPkg(pkg);
      setShowPayMethodModal(true);
  };

    // ========== 微信支付 ==========
    const handleWechatPay = async (pkg) => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/payment/wechat/create_order`, {
          package_id: pkg.id,
          amount: pkg.price,
          credits: pkg.credits,
        }, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.data.code !== 200) {
          showToast(res.data.message || '下单失败', true);
          return;
        }

        const { order_no, pay_params } = res.data.data;
        setShowRechargeModal(false);

      // 判断平台
      const isHarmony = !!window.harmonyBridge?.wechatPay;
      const isAndroid = /android/i.test(navigator.userAgent);

      if (isHarmony) {
        console.log('走 harmonyBridge.wechatPay');
        window.harmonyBridge.wechatPay(JSON.stringify(pay_params));
      } else if (isAndroid) {
        try {
          console.log('1. 检查微信是否安装');
          const installed = await CapacitorWechat.isInstalled();
          console.log('isInstalled:', installed);
          if (!installed) {
            showToast('请先安装微信', true);
            return;
          }

          console.log('2. 初始化微信 SDK');
          await CapacitorWechat.initialize({ appId: 'wxe0bd5e295cdd77c0' });
          console.log('initialize 成功');

          console.log('3. 调起微信支付');
          const result = await CapacitorWechat.sendPaymentRequest({
            partnerId: pay_params.partnerid,
            prepayId: pay_params.prepayid,
            nonceStr: pay_params.noncestr,
            timeStamp: pay_params.timestamp,
            package: pay_params.package,
            sign: pay_params.sign,
          });
          console.log('sendPaymentRequest 返回:', result);

        } catch (e) {
          console.error('微信支付失败:', e);
          showToast('微信支付失败: ' + (e.message || JSON.stringify(e)), true);
          return;
        }
      }

        // 复用现有轮询
        startPaymentPolling(order_no);
      } catch (err) {
        console.error('微信支付失败:', err);
        showToast(err.response?.data?.detail || '微信支付失败', true);
      } finally {
        setLoading(false);
      }
  };

  // ========== 支付宝（原逻辑） ==========
  const handleAlipay = async (pkg) => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/payment/create_order`, {
          package_id: pkg.id,
          amount: pkg.price,
          credits: pkg.credits
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const { pay_url, qr_code, out_trade_no } = res.data;

      setShowRechargeModal(false);
      setPendingOrderId(out_trade_no || '');
      setPaymentLink(pay_url || '');
      setPaymentQRCode('');

      if (qr_code) {
        setPaymentQRCode(qr_code);
        setShowPaymentModal(true);
        startPaymentPolling(out_trade_no);
        return;
      }

      if (pay_url) {
        if (pay_url.startsWith('http')) {
          try {
            await Linking.openURL(pay_url);
            startPaymentPolling(out_trade_no);
          } catch (err) {
            console.log('打开支付链接失败:', err);
            showToast('支付跳转失败，请重试', true);
          }
        } else {
          try {
            await Linking.openURL(pay_url);
            startPaymentPolling(out_trade_no);
          } catch (err) {
            console.log('唤起支付宝失败:', err);
            showToast('无法唤起支付宝，请确认已安装支付宝App', true);
          }
        }
        return;
      }

      showToast('支付链接获取失败', true);
    } catch (err) {
      showToast(err.response?.data?.detail || '创建订单失败', true);
    } finally {
      setLoading(false);
    }
  };

  // 支付状态轮询
  const startPaymentPolling = (orderId) => {
    let attempts = 0;
    const maxAttempts = 30;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await axios.get(`${API_URL}/payment/order_status/${orderId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.data.status === 'paid') {
          clearInterval(timer);
          await fetchUserCredits();
          setShowPaymentModal(false);
          setPendingOrderId('');
          showToast('支付成功，余额已更新');
        }
      } catch (err) {
        // 忽略轮询错误
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 2000);
  };

  const checkAIPrivacyConsent = () => {
    return new Promise((resolve) => {
      const consented = localStorage.getItem('ai_privacy_consent');
      if (consented) {
        resolve(true);
        return;
      }
      // 只有 iOS/iPad 弹窗
      if (navigator.platform.indexOf('iPhone') !== -1 || navigator.platform.indexOf('iPad') !== -1) {
        const result = window.confirm('使用此功能时，您的上传图片和提示词将发送至可灵AI、通义千问、腾讯云TTS处理。数据仅用于本次生成。是否同意？');
        if (result) localStorage.setItem('ai_privacy_consent', 'true');
        resolve(result);
        return;
      }
      // 其他平台直接放行
      localStorage.setItem('ai_privacy_consent', 'true');
      resolve(true);
    });
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/preset-avatars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data) {
        setPresetAvatars(response.data);
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
      
      setTtsVoices(allVoices);

      if (allVoices.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(allVoices[0].id);
        setDigitalVoice(allVoices[0].name);
      }
    } catch (error) {
      console.error('获取音色列表失败:', error);
      setTtsVoices(MANUAL_VOICES);
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
    
    if (playingVoiceId === voiceId) {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }
    
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
    
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
    if (!document.getElementById('registerAgree')?.checked) {
      showToast('请先阅读并同意隐私政策和用户协议', true);
      return;
    }
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
    if (!url) return;
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast('请先登录', true);
      return;
    }
    
    try {
      console.log('准备保存历史记录:', { url, type, thumbnail });
      const res = await axios.post(`${API_URL}/history/save`, {
        url: url,
        type: type,
        thumbnail: thumbnail
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('保存历史记录响应:', res.data);
      await loadHistory();
      console.log('历史记录已刷新');
    } catch (error) {
      console.error('保存历史记录失败:', error.message, error.response?.status, error.response?.data);
    }
  };
  
  const addWatermarkToImage = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const originalBytes = new Uint8Array(await blob.arrayBuffer());
    
    // 提取原图的文本块
    const textChunks = [];
    let pos = 8;
    while (pos < originalBytes.length) {
      const len = (originalBytes[pos] << 24) | (originalBytes[pos+1] << 16) | (originalBytes[pos+2] << 8) | originalBytes[pos+3];
      const type = String.fromCharCode(originalBytes[pos+4], originalBytes[pos+5], originalBytes[pos+6], originalBytes[pos+7]);
      if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
        textChunks.push(originalBytes.slice(pos, pos + 12 + len));
      }
      pos += 12 + len;
    }
    
    // Canvas 加水印
    const objectUrl = URL.createObjectURL(blob);
    const img = new window.Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = objectUrl; });
    URL.revokeObjectURL(objectUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const text = 'AI生成';
    const fontSize = Math.max(24, Math.floor(canvas.width * 0.05));
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const padding = 12;
    const boxW = metrics.width + padding * 2;
    const boxH = fontSize * 1.6 + padding * 2;
    const boxX = canvas.width - 30 - boxW;
    const boxY = Math.max(25, canvas.height * 0.04);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText(text, boxX + padding, boxY + boxH / 2);

    // 导出 PNG
    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    
    // 如果原图没有文本块，直接返回
    if (textChunks.length === 0) {
      return pngBlob;
    }
    
    // 在新图的 IHDR 之后插入原图的文本块
    // PNG 结构：签名(8) + IHDR(25) + 其他块 + IDAT + IEND
    const result = new Uint8Array(pngBytes.length + textChunks.reduce((s, c) => s + c.length, 0));
    
    // 复制签名 + IHDR
    const ihdrEnd = 8 + 25; // 签名8字节 + IHDR块(4长度+4类型+13数据+4CRC)
    result.set(pngBytes.slice(0, ihdrEnd), 0);
    
    // 插入文本块
    let offset = ihdrEnd;
    for (const chunk of textChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    // 复制剩余数据
    result.set(pngBytes.slice(ihdrEnd), offset);
    
    return new Blob([result], { type: 'image/png' });
  };

  const saveToGallery = async (url, type) => {
        try {
          const isImage = type === 'image';
          const filename = `AI_${type}_${Date.now()}.${isImage ? 'png' : 'mp4'}`;
          let finalUrl = url;
          let finalBlob = null;

          if (isImage) {
            try {
              finalBlob = await addWatermarkToImage(url);
              finalUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(finalBlob);
              });
            } catch (e) {
              console.error('处理失败:', e);
            }
          }

          if (window.harmonyBridge?.saveFile) {
            window.harmonyBridge.saveFile(finalUrl, filename);
            showToast('正在保存...');
            return;
          }

          if (/android/i.test(navigator.userAgent)) {
            const { Filesystem } = await import('@capacitor/filesystem');
            let base64Data;
            if (finalBlob) {
              base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(finalBlob);
              });
            } else {
              const res = await fetch(url);
              const b = await res.blob();
              base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(b);
              });
            }
            await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
            showToast(isImage ? '图片已保存' : '视频已保存');
            return;
          }

          // iOS：用 Filesystem + Share
          if (/iPhone|iPad/i.test(navigator.platform)) {
            try {
              // 1. 获取文件 blob
              const downloadBlob = finalBlob || await (await fetch(url)).blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(downloadBlob);
              });

              // 2. 写入文件
              const { Filesystem, Directory } = await import('@capacitor/filesystem');
              const result = await Filesystem.writeFile({
                path: filename,
                data: base64,
                directory: Directory.Cache,
              });

              // 3. 弹出分享菜单（用户可保存到相册）
              const { Share } = await import('@capacitor/share');
              await Share.share({
                title: filename,
                url: result.uri,
                dialogTitle: '保存文件',
              });
              showToast('已打开分享菜单');
            } catch (e) {
              console.error('iOS 保存失败:', e);
              showToast('保存失败，请重试', true);
            }
            return;
          }

          const downloadBlob = finalBlob || await (await fetch(url)).blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(downloadBlob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('文件已下载');

        } catch (err) {
          showToast('保存失败', true);
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
          timestamp: (() => {
            const d = new Date(new Date(item.timestamp).getTime() + 8 * 60 * 60 * 1000);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          })()
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

  const deleteHistoryItem = async (historyId) => {
      try {
        const token = localStorage.getItem('access_token');
        await axios.delete(`${API_URL}/history/${historyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        showToast('已删除');
        loadHistory();
      } catch (err) {
        showToast('删除失败', true);
      }
    };

    const showPhotoPicker = () => {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
          <div style="background:#1e1e2e;border-radius:16px;padding:24px;width:260px;text-align:center;">
            <div style="color:#fff;font-size:18px;margin-bottom:20px;">选择上传方式</div>
            <div style="display:flex;gap:12px;">
              <button id="picker-camera" style="flex:1;padding:12px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-size:15px;">拍照</button>
              <button id="picker-gallery" style="flex:1;padding:12px;border-radius:8px;border:1px solid #666;background:transparent;color:#fff;font-size:15px;">相册</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        document.getElementById('picker-camera').onclick = () => { overlay.remove(); resolve('camera'); };
        document.getElementById('picker-gallery').onclick = () => { overlay.remove(); resolve('gallery'); };
      });
    };

    const pickImage = async () => {
      if (/android/i.test(navigator.userAgent)) {
        const choice = await showPhotoPicker();
        if (choice === 'camera') { takePhoto(); return; }
      }
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
        if (res.assets && res.assets[0]) {
          setSelectedImage(res.assets[0]);
          setResult(null);
        }
      });
    };

    const takePhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        setSelectedImage({ uri: image.webPath });
        setResult(null);
      } catch (e) {
        showToast('拍照失败', true);
      }
    };

    // 电商套图：相册选择
    const pickMerchantImages = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          setMerchantImages([files[0]]);  // 只保留第一张
        }
      };
      input.click();
    };

    // 电商套图：拍照
    const takeMerchantPhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `merchant_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setMerchantImages([file]);  // 只保留第一张
      } catch (e) {
        showToast('拍照失败', true);
      }
    };

    // ========== 电商套图：生成 ==========
    const generateSuite = async () => {
      const consented = await checkAIPrivacyConsent();
      if (!consented) return;
      const isVerified = await checkPhoneVerified();
      if (!isVerified) {
        showToast('根据法规要求，使用AI功能前需完成手机号认证');
        setShowLoginModal(true);
        return;
      }
      
      if (merchantImages.length === 0) {
        return showToast('请上传商品图');
      }
      
      // 计算预估费用
      const costMap = { 
          white_bg: 10, 
          scene: 15 * suiteSceneCount, 
          aplus: 50 * suiteAplusCount   // ← 乘以数量
      };
      const estimatedCost = costMap[suiteType] || 10;
      
      if (userCredits < estimatedCost) {
        showToast(`需要 ${estimatedCost} 点，余额不足`);
        setShowRechargeModal(true);
        return;
      }
      
      setSuiteLoading(true);
      setIsGenerating(true);
      setGeneratingTitle('AI正在生成套图');
      setGeneratingSubtitle('商品分析 + 批量生成 + 图文合成');
      
      try {
        const formData = new FormData();
        const file = merchantImages[0];
        const safeFile = new File([file], `merchant_${Date.now()}.jpg`, { type: file.type || 'image/jpeg' });
        formData.append('image', safeFile);
        formData.append('suite_type', suiteType);
        formData.append('selling_points', suiteSellingPoints);
        formData.append('usage', suiteUsage);
        formData.append('region', suiteRegion);
        formData.append('platform', suitePlatform);
        formData.append('scene_count', suiteSceneCount);
        formData.append('aplus_count', suiteAplusCount);
        
        const token = localStorage.getItem('access_token');
        const res = await axios.post(`${API_URL}/merchant/generate_suite`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (res.data.code === 200) {
          if (res.data.data.async) {
            const taskId = res.data.data.task_id;
            showToast(`套图任务已提交，需要 ${estimatedCost} 点`);
            
            startPollingTask(
              taskId,
              '电商商品套图',
              `${API_URL}/merchant/task/${taskId}`,
              (task, status) => {
                setSuiteLoading(false);
                if (status === 'completed') {
                  const images = task?.output_data?.images || [];
                  setSuiteResult({
                    images,
                    analysis: task?.output_data?.analysis,
                    historyId: task?.output_data?.history_id,  // ← 加这行
                  });
                  showToast(`套图生成成功，共 ${images.length} 张`);
                  fetchUserCredits();
                  loadHistory();
                } else if (status === 'failed') {
                  showToast('套图生成失败，已退款', true);
                  fetchUserCredits();
                }
              }
            );
            return;
          }
          
          setSuiteResult({
            images: res.data.data.images,
            analysis: res.data.data.analysis,
            historyId: res.data.data.history_id,
          });
          showToast('套图生成成功');
          fetchUserCredits();
          await loadHistory();
          setSuiteLoading(false);
          setIsGenerating(false);
        } else {
          showToast(res.data.message || '生成失败', true);
          setSuiteLoading(false);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('套图生成失败:', err);
        showToast(err.response?.data?.detail || '生成失败', true);
        setSuiteLoading(false);
        setIsGenerating(false);
      }
    };

    // ========== 电商套图：下载单张 ==========
    const downloadSuiteImage = async (imageUrl) => {
      const fileName = `AI_电商套图_${Date.now()}.png`;
      
      // 鸿蒙
      if (window.harmonyBridge?.saveFile) {
        window.harmonyBridge.saveFile(imageUrl, fileName);
        showToast('正在下载...');
        return;
      }
      // iOS
      if (navigator.platform.indexOf('iPhone') !== -1 || navigator.platform.indexOf('iPad') !== -1) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
          });
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: fileName,
            url: result.uri,
            dialogTitle: '保存文件',
          });
          showToast('已打开分享菜单');
        } catch (e) {
          console.error('iOS 保存失败:', e);
          showToast('保存失败，请重试', true);
        }
        return;
      }
      // 安卓：加水印（后端已加，这里直接下载）
      if (/android/i.test(navigator.userAgent)) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
          await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents });
          showToast('图片已保存');
        } catch (e) { showToast('保存失败'); }
        return;
      }
      // Web
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('正在下载...');
    };

    const pickModelImage = async () => {
      if (/android/i.test(navigator.userAgent)) {
        const choice = await showPhotoPicker();
        if (choice === 'camera') { takeModelPhoto(); return; }
      }
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
        if (res.assets && res.assets[0]) setModelImage(res.assets[0]);
      });
    };

    const takeModelPhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        setModelImage({ uri: image.webPath });
      } catch (e) { showToast('拍照失败', true); }
    };

    const pickGarmentImage = async () => {
      if (/android/i.test(navigator.userAgent)) {
        const choice = await showPhotoPicker();
        if (choice === 'camera') { takeGarmentPhoto(); return; }
      }
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
        if (res.assets && res.assets[0]) setGarmentImage(res.assets[0]);
      });
    };

    const takeGarmentPhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        setGarmentImage({ uri: image.webPath });
      } catch (e) { showToast('拍照失败', true); }
    };

    const pickDigitalImage = async () => {
      if (/android/i.test(navigator.userAgent)) {
        const choice = await showPhotoPicker();
        if (choice === 'camera') { takeDigitalPhoto(); return; }
      }
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
        if (res.assets && res.assets[0]) setDigitalImage(res.assets[0]);
      });
    };

    const takeDigitalPhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        setDigitalImage({ uri: image.webPath });
      } catch (e) { showToast('拍照失败', true); }
    };

    const pickCustomVideo = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4,video/quicktime,video/x-msvideo';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) setCustomVideo(file);
      };
      input.click();
    };

    const pickMultiImage = async () => {
      if (multiImages.length >= 4) {
        showToast('最多上传4张照片', true);
        return;
      }
      if (/android/i.test(navigator.userAgent)) {
        const choice = await showPhotoPicker();
        if (choice === 'camera') { takeMultiPhoto(); return; }
      }
      ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 }, (res) => {
        if (res.assets?.[0]) setMultiImages([...multiImages, res.assets[0]]);
      });
    };

    const takeMultiPhoto = async () => {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 90,
        });
        setMultiImages([...multiImages, { uri: image.webPath }]);
      } catch (e) { showToast('拍照失败', true); }
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
    const consented = await checkAIPrivacyConsent();
    if (!consented) return;
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
        const consented = await checkAIPrivacyConsent();
        if (!consented) return;
        const isVerified = await checkPhoneVerified();
        if (!isVerified) {
          showToast('根据法规要求，使用AI功能前需完成手机号认证');
          setShowLoginModal(true);
          return;
        }
        
        if (!prompt && !selectedImage) {
          return showToast('请选择一张参考图片或输入描述文字');
        }
        
        setImageLoading(true);
        setIsGenerating(true);
        setGeneratingTitle('AI正在生成图片');
        setGeneratingSubtitle(selectedImage ? '图生图模式（人物保留增强）' : '文生图模式');
      
        const formData = new FormData();
        
        if (selectedImage) {
          const file = await convertToFile(selectedImage);
          const ext = file.name?.split('.').pop() || 'jpg';
          const safeFile = new File([file], `image_${Date.now()}.${ext}`, { type: file.type });
          formData.append('reference_image', safeFile);
        }
        
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
          
          // 异步模式
          if (res.data?.async === true) {
            const taskId = res.data.task_id;
            showToast('图片生成任务已提交，预计30秒内完成');
            
            startPollingTask(
              taskId,
              '图片生成',
              `${API_URL}/image/task/${taskId}`,
              (task, status) => {
                setImageLoading(false);
              }
            );
            return;
          }
          
          // 同步模式
          showToast('图片生成成功');
          await loadHistory();
          setImageLoading(false);
          setIsGenerating(false);
        } catch (err) {
          console.error('图片生成错误:', err);
          showToast(err.message || '生成失败', true);
          setImageLoading(false);
          setIsGenerating(false);
        }
      };

  // ========== 获取视频价格 ==========
  const getVideoPrice = () => {
    if (videoModel === '2.6') {
      const prices = {5: 25, 10: 50};
      return prices[duration] || 0;
    } else {
      if (videoSound === 'off') {
        const prices = {5: 45, 10: 90, 15: 135};
        return prices[duration] || 0;
      } else {
        const prices = {5: 60, 10: 120, 15: 180};
        return prices[duration] || 0;
      }
    }
  };
  // ==============================

  const generateVideo = async () => {
      const consented = await checkAIPrivacyConsent();
      if (!consented) return;
      const isVerified = await checkPhoneVerified();
      if (!isVerified) {
        showToast('根据法规要求，使用AI功能前需完成手机号认证');
        setShowLoginModal(true);
        return;
      }
      
      const cost = getVideoPrice();
      if (cost === 0) {
        showToast('请选择有效的视频参数', true);
        return;
      }
      
      if (userCredits < cost) {
        showToast(`余额不足，需要${cost}点`);
        setShowRechargeModal(true);
        return;
      }
      
      if (!selectedImage) return showToast('请先选择一张图片');
      setVideoLoading(true);
      setIsGenerating(true);
      setGeneratingTitle('AI正在生成视频');
      setGeneratingSubtitle(
        videoModel === '3.0' && videoSound === 'native' 
          ? '3.0增强版 有声视频生成中' 
          : videoModel === '3.0' 
            ? '3.0增强版 无声视频生成中' 
            : '2.6基础版 无声视频生成中'
      );
    
      const formData = new FormData();
      const file = await convertToFile(selectedImage);
      const ext = file.name?.split('.').pop() || 'jpg';
      const safeFile = new File([file], `video_${Date.now()}.${ext}`, { type: file.type });
      formData.append('image', safeFile);
      formData.append('prompt', prompt || '生成动态视频');
      formData.append('duration', duration.toString());
      formData.append('mode', 'std');
      formData.append('model', videoModel);
      formData.append('sound', videoSound);
      formData.append('credits', cost.toString());

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
        
        // 异步模式
        if (res.data?.async === true) {
          const taskId = res.data.task_id;
          showToast('视频生成任务已提交，预计1-3分钟完成');
          
          startPollingTask(
            taskId,
            '视频生成',
            `${API_URL}/video/task/${taskId}`,
            (task, status) => {
              setVideoLoading(false);
              if (status === 'completed') {
                const videoUrl = task?.output_data?.video_url || task?.video_url;
                if (videoUrl) {
                  setResult({ video_url: videoUrl });
                }
                loadHistory();
              }
            }
          );
          return;
        }
        
        // 同步模式
        const videoUrl = res.data?.data?.output_data?.video_url || 
                        res.data?.output_data?.video_url || 
                        res.data?.video_url;
      
        if (!videoUrl) {
          showToast('视频生成成功，但无法获取链接', true);
          return;
        }
        
        setResult({ video_url: videoUrl });
        
        if (res.remaining_credits !== undefined) {
          setUserCredits(res.remaining_credits);
        } else if (res.data?.remaining_credits !== undefined) {
          setUserCredits(res.data.remaining_credits);
        }
        
        showToast(`视频生成成功${videoModel === '3.0' && videoSound === 'native' ? '（有声）' : '（无声）'}`);
        await loadHistory();
        setVideoLoading(false);
        setIsGenerating(false);
      } catch (err) {
        console.error('视频生成错误:', err);
        showToast(err.message || '生成失败', true);
        setVideoLoading(false);
        setIsGenerating(false);
      }
    };

  const generateTryon = async () => {
      const consented = await checkAIPrivacyConsent();
      if (!consented) return;
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
            { text: '取消', onPress: () => { setTryonLoading(false); setIsGenerating(false); return; } }
          ]
        );
      }
      setTryonLoading(true);
      setIsGenerating(true);
      setGeneratingTitle('AI正在生成试穿视频');
      setGeneratingSubtitle('服装上身效果展示');
    
      const formData = new FormData();
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
        
        // ========== 异步模式 ==========
        if (res.data?.async === true) {
          const taskId = res.data.task_id;
          showToast('虚拟试穿任务已提交，预计1分钟内完成');
          
          startPollingTask(
            taskId,
            '虚拟试穿',
            `${API_URL}/tryon/task/${taskId}`,
            (task, status) => {
              setTryonLoading(false);
            }
          );
          return;
        }
        // ==========================
      
        // 同步模式
        showToast('试穿视频生成成功');
        await loadHistory();
        setTryonLoading(false);
        setIsGenerating(false);
      } catch (err) {
        console.error('虚拟试穿错误:', err);
        showToast(err.message || '试穿失败', true);
        setTryonLoading(false);
        setIsGenerating(false);
      }
    };

  const generateDigitalHuman = async () => {
      const consented = await checkAIPrivacyConsent();
      if (!consented) return;
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
        
        // ========== 异步模式 ==========
        if (res.data?.async === true) {
          const taskId = res.data.task_id;
          showToast('数字人视频生成任务已提交，预计2-5分钟完成');
          
          startPollingTask(
            taskId,
            '数字人分身',
            `${API_URL}/digital-human/task/${taskId}`,
            (task, status) => {
              setDigitalLoading(false);
              if (status === 'completed') {
                const videoUrl = task?.output_data?.video_url || task?.video_url;
                if (videoUrl) {
                  setResult({ video_url: videoUrl });
                }
                loadHistory();
              }
            }
          );
          return;
        }
        // ==========================
      
        // 同步模式
        const videoUrl = res.data?.video_url || res.video_url;
      
        if (!videoUrl) {
          console.error('无法提取视频 URL:', res);
          showToast('数字人视频生成成功，但无法获取链接', true);
          setDigitalLoading(false);
          setIsGenerating(false);
          return;
        }
      
        setResult({ video_url: videoUrl });
        
        // 后端已保存历史记录，前端不再重复保存
        // saveToHistory(videoUrl, '数字人分身');
        
        showToast('数字人视频生成成功');
        await loadHistory();
        
        setDigitalLoading(false);
        setIsGenerating(false);
      } catch (err) {
        console.error('数字人分身错误:', err);
        showToast(err.message || '生成失败', true);
        setDigitalLoading(false);
        setIsGenerating(false);
      }
    };

    // ========== 口播带货：选择人物图 ==========
    const pickTalkingAvatarImage = async () => {
      // Web / 浏览器：用文件选择器
      if (typeof window !== 'undefined' && !window.harmonyBridge) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (file) {
            setTalkingAvatarImage(file);
          }
        };
        input.click();
        return;
      }

      // 原生 App（Capacitor）：用相机/相册
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
          quality: 90,
        });
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `talking_avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setTalkingAvatarImage(file);
      } catch (e) {
        console.log('选择图片取消或失败:', e);
      }
    };

    // ========== 口播带货：选择商品图 ==========
    const pickTalkingProductImage = async () => {
      if (talkingProductImages.length >= 5) {
        showToast('最多上传 5 张商品图');
        return;
      }

      // Web / 浏览器：用文件选择器
      if (typeof window !== 'undefined' && !window.harmonyBridge) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
          const files = Array.from(e.target.files || []);
          const remaining = 5 - talkingProductImages.length;
          const newFiles = files.slice(0, remaining);
          setTalkingProductImages([...talkingProductImages, ...newFiles]);
        };
        input.click();
        return;
      }

      // 原生 App
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
          quality: 90,
        });
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `talking_product_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setTalkingProductImages([...talkingProductImages, file]);
      } catch (e) {
        console.log('选择图片取消或失败:', e);
      }
    };

  // ========== 口播带货：生成 ==========
  const generateTalkingAgent = async () => {
    const consented = await checkAIPrivacyConsent();
    if (!consented) return;
    const isVerified = await checkPhoneVerified();
    if (!isVerified) {
      showToast('根据法规要求，使用AI功能前需完成手机号认证');
      setShowLoginModal(true);
      return;
    }
    
    // ========== 参数验证 ==========
    if (avatarMode === 'upload' && !talkingAvatarImage) {
      return showToast('请上传人物照片');
    }
    if (avatarMode === 'preset' && !talkingAvatarId) {
      return showToast('请选择预设形象');
    }
    if (!talkingScript.trim()) {
      return showToast('请填写口播稿');
    }
    
    // 有商品信息时，必须上传商品图和标题
    const hasProduct = talkingProductImages.length > 0 || talkingGoodsTitle || talkingGoodsPrice || talkingTargetAudience || talkingSellingPoint;
    if (hasProduct) {
      if (talkingProductImages.length === 0) {
        return showToast('请上传商品图（至少 1 张）');
      }
      if (!talkingGoodsTitle.trim()) {
        return showToast('请填写商品标题');
      }
    }
    
    // ========== 计算预估 ==========
    const { scriptLength, estimatedSeconds, estimatedCost } = calcTalkingAgentCost(talkingScript);
    setTalkingEstimatedInfo({ scriptLength, estimatedSeconds, estimatedCost });
    
    // 检查余额
    if (userCredits < estimatedCost) {
      showToast(`口播稿 ${scriptLength} 字，预估 ${estimatedSeconds} 秒，需要 ${estimatedCost} 点，当前余额 ${userCredits} 点`);
      setShowRechargeModal(true);
      return;
    }
    
    setTalkingLoading(true);
    setIsGenerating(true);
    setGeneratingTitle('AI正在生成口播视频');
    setGeneratingSubtitle(`口播稿 ${scriptLength} 字，预估 ${estimatedSeconds} 秒`);
    
    try {
      const formData = new FormData();
      
      // 人物来源
      if (avatarMode === 'upload' && talkingAvatarImage) {
        formData.append('avatar_image', talkingAvatarImage);
        formData.append('voice_id', talkingVoiceId);
      } else if (avatarMode === 'preset' && talkingAvatarId) {
        formData.append('avatar_id', talkingAvatarId);
      }
      
      // 商品信息
      if (talkingProductImages.length > 0) {
        talkingProductImages.forEach(img => {
          formData.append('product_images', img);
        });
      }
      if (talkingGoodsTitle) formData.append('goods_title', talkingGoodsTitle);
      if (talkingGoodsPrice) formData.append('goods_price', talkingGoodsPrice);
      if (talkingTargetAudience) formData.append('target_audience', talkingTargetAudience);
      if (talkingSellingPoint) formData.append('selling_point', talkingSellingPoint);
      
      // 口播稿
      formData.append('script', talkingScript);
      
      // 设置
      formData.append('resolution', talkingResolution);
      formData.append('aspect_ratio', talkingAspectRatio);
      formData.append('allow_polish', talkingAllowPolish.toString());
      formData.append('bgm_enabled', talkingBgmEnabled.toString());
      
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/talking-agent/generate`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成失败');
      }
      
      const res = await response.json();
      console.log('口播带货响应:', res);
      
      // ========== 异步模式 ==========
      if (res.data?.async === true) {
        const taskId = res.data.task_id;
        showToast(`口播稿 ${scriptLength} 字，预估 ${estimatedSeconds} 秒，已预扣 ${estimatedCost} 点`);
        
        startPollingTask(
          taskId,
          '口播带货',
          `${API_URL}/talking-agent/task/${taskId}`,
          (task, status) => {
            setTalkingLoading(false);
            if (status === 'completed') {
              const videoUrl = task?.output_data?.video_url;
              const duration = task?.output_data?.duration;
              const actualCost = task?.output_data?.actual_cost;
              const refund = task?.output_data?.refund;
              
              if (videoUrl) {
                setResult({ video_url: videoUrl });
              }
              
              // 通知用户实际费用
              showToast(
                `口播视频生成成功\n实际时长：${duration}秒\n实际费用：${actualCost}点` +
                (refund > 0 ? `\n退款：${refund}点` : '')
              );
              
              // 更新余额
              fetchUserCredits();
            }
          }
        );
        return;
      }
      // ==========================
      
      // 同步模式
      const videoUrl = res.data?.video_url;
      if (videoUrl) {
        setResult({ video_url: videoUrl });
        showToast('口播视频生成成功');
        await loadHistory();
        fetchUserCredits();
      }
      setTalkingLoading(false);
      setIsGenerating(false);
    } catch (err) {
      console.error('口播带货错误:', err);
      showToast(err.message || '生成失败', true);
      setTalkingLoading(false);
      setIsGenerating(false);
    }
  };
  // ==============================================

  // 通用后台轮询：完成后自动保存历史记录
    const startPollingTask = (taskId, type, queryUrl, onComplete) => {
      // 持久化任务信息
      localStorage.setItem('pending_task', JSON.stringify({ taskId, type, queryUrl }));
      
      let attempts = 0;
      const maxAttempts = 60;
      
      // ========== 轮询间隔：根据 type 调整 ==========
      const getInterval = () => {
        if (type === '图片生成') return 3000;
        if (type === '虚拟试穿') return 3000;
        if (type === '多角度试穿') return 5000;
        if (type === '视频生成') return 5000;
        if (type === '数字人分身') return 5000;
        if (type === '口播带货') return 5000;
        if (type === '电商商品套图') return 8000;
        return 5000;
      };
      // ============================================
      
      if (pollingRef.current) clearInterval(pollingRef.current);
      
      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const token = localStorage.getItem('access_token');
          if (!token) { 
            clearInterval(pollingRef.current); 
            localStorage.removeItem('pending_task');
            if (onComplete) onComplete(null, 'no_token');
            setIsGenerating(false); 
            return; 
          }
          
          const statusRes = await axios.get(queryUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('轮询返回:', JSON.stringify(statusRes.data));
          const task = statusRes.data.data;
          if (!task) return;
          
          if (task.status === 'completed') {
            clearInterval(pollingRef.current);
            localStorage.removeItem('pending_task');
            
            // 调用完成回调
            if (onComplete) {
              onComplete(task, 'completed');
            }
            
            setIsGenerating(false);
            
            // 根据 type 处理结果
            const videoUrl = task.video_url || task.output_data?.video_url;
            const thumbnail = task.thumbnail || null;
            
            if (type === '图片生成') {
              if (task.output_data?.images?.length > 0) {
                setResult({ images: task.output_data.images });
              }
            } else if (type === '视频生成') {
              if (videoUrl) {
                setResult({ video_url: videoUrl });
              }
            } else if (type === '虚拟试穿' || type === '多角度试穿') {
              if (videoUrl) {
                setResult({ video_url: videoUrl });
              }
            } else if (type === '数字人分身') {
              if (videoUrl) {
                setResult({ video_url: videoUrl });
              }
            } else if (type === '口播带货') {
              if (videoUrl) {
                setResult({ video_url: videoUrl });
              }
            }
            
            showToast(`🎉 ${type}生成成功！`);
            await loadHistory();
          } else if (task.status === 'failed') {
            clearInterval(pollingRef.current);
            localStorage.removeItem('pending_task');
            if (onComplete) {
              onComplete(task, 'failed');
            }
            setIsGenerating(false);
            showToast(`${type}生成失败: ${task.message || '请重试'}`, true);
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollingRef.current);
            localStorage.removeItem('pending_task');
            if (onComplete) onComplete(null, 'timeout');
            setIsGenerating(false);
            showToast('生成超时，请稍后在历史记录中查看', true);
          }
        } catch (err) {
          console.error('轮询错误:', err);
          if (attempts >= maxAttempts) {
            clearInterval(pollingRef.current);
            localStorage.removeItem('pending_task');
            if (onComplete) onComplete(null, 'error');
            setIsGenerating(false);
          }
        }
      }, getInterval());

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    };

  const generateMultiAngle = async () => {
      const consented = await checkAIPrivacyConsent();
      if (!consented) return;
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
        
      setMultiLoading(true);
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
        
        // ========== 异步模式 ==========
        if (res.data?.async === true) {
          const taskId = res.data.task_id;
          showToast('多角度试穿任务已提交，预计2-3分钟完成');
          
          startPollingTask(
            taskId,
            '多角度试穿',
            `${API_URL}/multi-angle/task/${taskId}`,
            (task, status) => {
              setMultiLoading(false);
              if (status === 'completed') {
                const videoUrl = task?.output_data?.video_url || task?.video_url;
                if (videoUrl) {
                  setCurrentVideoUrl(videoUrl);
                  setVideoModalVisible(true);
                }
              }
            }
          );
          return;
        }
        // ==========================
      
        // 同步模式
        const videoUrl = res.data?.video_url;
      
        if (!videoUrl) {
          console.error('无法提取视频 URL:', res);
          showToast('多角度合成成功，但无法获取视频链接', true);
          setMultiLoading(false);
          setIsGenerating(false);
          return;
        }
      
        // 显示结果视频
        setCurrentVideoUrl(videoUrl);
        setVideoModalVisible(true);
        
        // 后端已保存历史记录，前端不再重复保存
        // saveToHistory(videoUrl, '多角度试穿', res.data?.thumbnail);
        
        showToast('多角度视频生成成功');
        await loadHistory();
        
        setMultiLoading(false);
        setIsGenerating(false);
      } catch (err) {
        console.error('多角度合成错误:', err);
        showToast(err.message || '合成失败', true);
        setMultiLoading(false);
        setIsGenerating(false);
      }
    };

  const handleGenerate = () => {
          switch (activeTab) {
            // case 'size': recommendSize(); break;
            case 'image': generateImage(); break;
            case 'video': generateVideo(); break;
            case 'tryon': generateTryon(); break;
            case 'multi': generateMultiAngle(); break;  // ✅ 新增多角度
            case 'digital': generateDigitalHuman(); break;
            case 'digital_custom': generateTalkingAgent(); break;  // ← 改这里
            default: break;
          }
        };

  const renderResult = () => {
    if (!result) return null;

  const downloadFile = async (url, filename) => {
        try {
          const isImage = /\.(png|jpe?g)$/i.test(filename);
          let finalUrl = url;
          let finalBlob = null;

          if (isImage) {
            try {
              finalBlob = await addWatermarkToImage(url);
              finalUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(finalBlob);
              });
            } catch (e) {
              console.error('处理失败:', e);
            }
          }

          const finalFilename = isImage ? filename.replace(/\.(png|jpe?g)$/i, '.png') : filename;

          if (window.harmonyBridge?.saveFile) {
            window.harmonyBridge.saveFile(finalUrl, finalFilename);
            showToast('正在下载...');
            return;
          }
          
          if (/android/i.test(navigator.userAgent)) {
            const { Filesystem } = await import('@capacitor/filesystem');
            let base64Data;
            if (finalBlob) {
              base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(finalBlob);
              });
            } else {
              const res = await fetch(url);
              const b = await res.blob();
              base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(b);
              });
            }
            await Filesystem.writeFile({ path: finalFilename, data: base64Data, directory: Directory.Documents });
            showToast('文件已保存到内部存储/Documents');
            return;
          }
          
          // iOS
          if (/iPhone|iPad/i.test(navigator.platform)) {
            try {
              const downloadBlob = finalBlob || await (await fetch(url)).blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(downloadBlob);
              });

              const { Filesystem, Directory } = await import('@capacitor/filesystem');
              const result = await Filesystem.writeFile({
                path: finalFilename,
                data: base64,
                directory: Directory.Cache,
              });

              const { Share } = await import('@capacitor/share');
              await Share.share({
                title: finalFilename,
                url: result.uri,
                dialogTitle: '保存文件',
              });
              showToast('已打开分享菜单');
            } catch (e) {
              console.error('iOS 保存失败:', e);
              showToast('保存失败，请重试', true);
            }
            return;
          }

          const downloadBlob = finalBlob || await (await fetch(url)).blob();
          const downloadUrl = URL.createObjectURL(downloadBlob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = finalFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          showToast('下载已开始');

        } catch (err) {
          showToast('下载失败，请重试', true);
        }
      };

    // 尺码推荐
    // if (activeTab === 'size') {
    //   return (
    //     <Card style={styles.resultCard}>
    //       <Text style={styles.resultTitle}>📏 尺码推荐</Text>
    //       <View style={styles.sizeRow}>
    //         <View style={styles.sizeItem}>
    //           <Text style={styles.sizeLabel}>胸围</Text>
    //           <Text style={styles.sizeValue}>{result.bust} cm</Text>
    //         </View>
    //         <View style={styles.sizeItem}>
    //           <Text style={styles.sizeLabel}>腰围</Text>
    //           <Text style={styles.sizeValue}>{result.waist} cm</Text>
    //         </View>
    //         <View style={styles.sizeItem}>
    //           <Text style={styles.sizeLabel}>臀围</Text>
    //           <Text style={styles.sizeValue}>{result.hip} cm</Text>
    //         </View>
    //       </View>
    //       <Text style={styles.recommendSize}>推荐尺码: {result.recommended_size}</Text>
    //     </Card>
    //   );
    // }

    // 图片或图片数组
    if ((activeTab === 'image' || activeTab === 'multi') && result.images) {
      const imageUrl = result.images[0].url;
      const filename = `AI_${activeTab === 'image' ? 'image' : 'multiangle'}_${Date.now()}.png`;
      return (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>{activeTab === 'image' ? '✨ 生成图片' : '🔄 多角度合成'}</Text>
          <TouchableOpacity onPress={() => { setPreviewUrl(imageUrl); setModalVisible(true); }}>
            <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={async (e) => {
                e.stopPropagation();
                const text = imageUrl; // 或 videoUrl
                try {
                  const { Clipboard } = await import('@capacitor/clipboard');
                  await Clipboard.write({ string: text });
                  showToast('链接已复制');
                } catch {
                  // 降级
                  const input = document.createElement('input');
                  input.value = text;
                  input.style.position = 'fixed';
                  input.style.opacity = '0';
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand('copy');
                  document.body.removeChild(input);
                  showToast('链接已复制');
                }
              }}
              style={styles.actionButton}
            >
              <Icon name="copy-outline" size={18} color="#7c3aed" />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
            {navigator.platform.indexOf('iPhone') === -1 && navigator.platform.indexOf('iPad') === -1 && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); downloadFile(imageUrl, filename); }} style={styles.actionButton}>
                <Icon name="download-outline" size={18} color="#10b981" />
                <Text style={styles.actionText}>下载</Text>
              </TouchableOpacity>
            )}
            {navigator.platform.indexOf('iPhone') === -1 && navigator.platform.indexOf('iPad') === -1 && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); saveToGallery(imageUrl, 'image'); }} style={styles.actionButton}>
                <Icon name="image-outline" size={18} color="#f59e0b" />
                <Text style={styles.actionText}>保存相册</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );
    }

    // 视频（包括虚拟试穿、数字人分身等）
    if ((activeTab === 'video' || activeTab === 'tryon' || activeTab === 'digital') && result.video_url) {
      const videoUrl = result.video_url;
      const filename = `AI_${activeTab === 'video' ? 'video' : activeTab === 'tryon' ? 'tryon' : 'digital'}_${Date.now()}.mp4`;

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
              bottom: 4,
              right: 4,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 3,
            }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>AI生成</Text>
            </View>
          </View>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={async (e) => {
                e.stopPropagation();
                const text = videoUrl; 
                try {
                  const { Clipboard } = await import('@capacitor/clipboard');
                  await Clipboard.write({ string: text });
                  showToast('链接已复制');
                } catch {
                  // 降级
                  const input = document.createElement('input');
                  input.value = text;
                  input.style.position = 'fixed';
                  input.style.opacity = '0';
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand('copy');
                  document.body.removeChild(input);
                  showToast('链接已复制');
                }
              }}
              style={styles.actionButton}
            >
              <Icon name="copy-outline" size={18} color="#7c3aed" />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                downloadFile(videoUrl, filename);
              }} 
              style={styles.actionButton}
            >
              <Icon name="download-outline" size={18} color="#10b981" />
              <Text style={styles.actionText}>下载</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                saveToGallery(videoUrl, 'video');
              }} 
              style={styles.actionButton}
            >
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
    // { key: 'size', icon: 'body-outline', label: '尺码', color: '#7c3aed' },
    { key: 'image', icon: 'image-outline', label: '图片', color: '#10b981' },
    { key: 'video', icon: 'videocam-outline', label: '视频', color: '#f59e0b' },
    { key: 'tryon', icon: 'shirt-outline', label: '试穿', color: '#ef4444' },
    { key: 'digital', icon: 'person-circle-outline', label: '数字人', color: '#06b6d4' },
    { key: 'digital_custom', icon: 'mic-outline', label: '口播带货', color: '#f97316' },
    { key: 'multi', icon: 'albums-outline', label: '多角度', color: '#8b5cf6' },
    { key: 'merchant', icon: 'bag-handle-outline', label: '电商套图', color: '#ec4899' },
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
                if (tab.key === 'digital') {
                  fetchPresetAvatars();
                  fetchTtsVoices();
                }
              }}
            >
              <Icon name={tab.icon} size={24} color={activeTab === tab.key ? tab.color : '#888'} />
              <Text 
                style={[styles.tabText, activeTab === tab.key && { color: tab.color }]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 其他 Tab 内容（放在 ScrollView 内） */}
        {activeTab !== 'profile' && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab !== 'tryon' && activeTab !== 'digital' && activeTab !== 'multi' && activeTab !== 'merchant' && activeTab !== 'digital_custom' && (
              <Card style={styles.imageCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {activeTab === 'size' ? '📸 上传全身照' :
                    activeTab === 'image' ? '🎨 上传参考图（可选）' :
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
                      {activeTab === 'image' && (
                        <Text style={{ color: '#888', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                          上传图片为图生图模式（人物还原增强）{'\n'}不上传则直接输入描述文字生成
                        </Text>
                      )}
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
                      <View style={{ width: '100%', height: 200, position: 'relative' }}>
                        <Image
                          key={modelImage?.uri}
                          source={{ uri: modelImage?.uri }}
                          style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                        />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </View>
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
                          paddingHorizontal: 14,
                          borderRadius: 20,
                          backgroundColor: clothCategory === cat ? '#FF4757' : '#f0f0f0',
                        }}
                      >
                        <Text style={{
                          color: clothCategory === cat ? '#fff' : '#333',
                          fontWeight: 'bold',
                        }}>
                          {cat === 'other' ? '其他' : cat === 'dress' ? '套装/裙' : '下身'}
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
                      <View style={{ width: '100%', height: 200, position: 'relative' }}>
                        <Image
                          key={garmentImage?.uri}
                          source={{ uri: garmentImage?.uri }}
                          style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                        />
                        <View style={styles.imageOverlay}>
                          <Text style={styles.overlayText}>点击更换</Text>
                        </View>
                      </View>
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
                
                {/* 刷新按钮 */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 4 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      fetchPresetAvatars();
                      fetchTtsVoices();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
                  >
                    <Icon name="refresh-outline" size={18} color="#7c3aed" />
                    <Text style={{ color: '#7c3aed', fontSize: 12, marginLeft: 4 }}>刷新</Text>
                  </TouchableOpacity>
                </View>

                {/* ========== 预设形象横向滚动列表 ========== */}

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                    {presetAvatars
                      .filter(avatar => avatarCategory === 'all' || avatar.category === avatarCategory)
                      .map(avatar => (
                        <TouchableOpacity
                          key={avatar.id}
                          style={[styles.avatarCard, selectedAvatarId === avatar.id && styles.avatarCardActive]}
                          onPress={() => {
                            if (avatar.preview_video_url) {
                              setCurrentPreviewVideoUrl(avatar.preview_video_url);
                              setPreviewVideoVisible(true);
                            } else {
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitle}>🎵 选择音色</Text>
                    <TouchableOpacity onPress={fetchTtsVoices} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
                      <Icon name="refresh-outline" size={18} color="#7c3aed" />
                      <Text style={{ color: '#7c3aed', fontSize: 12, marginLeft: 4 }}>刷新</Text>
                    </TouchableOpacity>
                  </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {ttsVoices.map(voice => (
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
                      ))}
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
              <ScrollView contentContainerStyle={styles.content}>
                {/* ========== 人物来源 ========== */}
                <Card style={styles.imageCard}>
                  <Text style={styles.cardTitle}>👤 人物来源</Text>
                  
                  <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.subTab, { flex: 1 }, avatarMode === 'upload' && styles.activeSubTab]}
                      onPress={() => setAvatarMode('upload')}
                    >
                      <Text style={[styles.subTabText, avatarMode === 'upload' && styles.activeSubTabText]}>上传照片</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subTab, { flex: 1 }, avatarMode === 'preset' && styles.activeSubTab]}
                      onPress={() => setAvatarMode('preset')}
                    >
                      <Text style={[styles.subTabText, avatarMode === 'preset' && styles.activeSubTabText]}>选择形象</Text>
                    </TouchableOpacity>
                  </View>

                  {avatarMode === 'upload' ? (
                    <>
                      <TouchableOpacity onPress={pickTalkingAvatarImage} style={styles.imagePicker}>
                        {talkingAvatarImage ? (
                          <View style={{ width: '100%', height: 200, position: 'relative' }}>
                            <Image
                              source={{ uri: URL.createObjectURL(talkingAvatarImage) }}
                              style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                            />
                            <View style={styles.imageOverlay}>
                              <Text style={styles.overlayText}>点击更换</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.placeholder}>
                            <Icon name="person-outline" size={48} color="#666" />
                            <Text style={styles.placeholderText}>点击上传人物照片</Text>
                            <Text style={styles.hintText}>建议单人、正脸清晰、嘴部无遮挡</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      
                      <Text style={[styles.label, { marginTop: 12 }]}>选择音色</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {TALKING_VOICE_OPTIONS.map(voice => (
                          <TouchableOpacity
                            key={voice.id}
                            style={[
                              styles.voiceItem,
                              talkingVoiceId === voice.id && { backgroundColor: '#7c3aed' }
                            ]}
                            onPress={() => setTalkingVoiceId(voice.id)}
                          >
                            <Text style={[
                              styles.voiceItemText,
                              talkingVoiceId === voice.id && { color: '#fff' }
                            ]}>
                              {voice.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4 }}
                        style={{ marginTop: 8 }}
                      >
                        {PRESET_AVATAR_IDS.map(avatar => (
                          <TouchableOpacity
                            key={avatar.id}
                            style={[
                              {
                                width: 100,
                                alignItems: 'center',
                                paddingVertical: 10,
                                paddingHorizontal: 6,
                                marginRight: 8,
                                borderRadius: 8,
                                backgroundColor: '#2d2d44',
                              },
                              talkingAvatarId === avatar.id && { backgroundColor: '#7c3aed' }
                            ]}
                            onPress={() => setTalkingAvatarId(avatar.id)}
                          >
                            <View style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              backgroundColor: talkingAvatarId === avatar.id ? '#5b21b6' : '#444',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginBottom: 6,
                            }}>
                              <Icon name="person" size={28} color={talkingAvatarId === avatar.id ? '#fff' : '#aaa'} />
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                color: talkingAvatarId === avatar.id ? '#fff' : '#ccc',
                                textAlign: 'center',
                                width: '100%',
                              }}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {avatar.name}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                color: talkingAvatarId === avatar.id ? '#fff' : '#888',
                                marginTop: 2,
                                textAlign: 'center',
                                width: '100%',
                              }}
                              numberOfLines={1}
                            >
                              {avatar.gender}·{avatar.age}岁
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}
                </Card>

                {/* ========== 商品信息（可选） ========== */}
                <Card style={styles.imageCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>🛍️ 商品信息（可选）</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>不填则为达人口播</Text>
                  </View>
                  
                  <Text style={styles.label}>商品图片（最多5张）</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {talkingProductImages.map((img, index) => (
                      <View key={index} style={{ marginRight: 8, position: 'relative' }}>
                        <Image source={{ uri: URL.createObjectURL(img) }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                        <TouchableOpacity
                          style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => {
                            const newImages = [...talkingProductImages];
                            newImages.splice(index, 1);
                            setTalkingProductImages(newImages);
                          }}
                        >
                          <Icon name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {talkingProductImages.length < 5 && (
                      <TouchableOpacity
                        onPress={pickTalkingProductImage}
                        style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Icon name="add" size={32} color="#888" />
                      </TouchableOpacity>
                    )}
                  </ScrollView>

                  <Text style={[styles.label, { marginTop: 12 }]}>商品标题</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="例如：JBL GO 4 便携蓝牙音箱"
                    placeholderTextColor="#888"
                    value={talkingGoodsTitle}
                    onChangeText={setTalkingGoodsTitle}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>商品价格（可选）</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="例如：399元"
                    placeholderTextColor="#888"
                    value={talkingGoodsPrice}
                    onChangeText={setTalkingGoodsPrice}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>目标人群（可选）</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="例如：露营人群"
                    placeholderTextColor="#888"
                    value={talkingTargetAudience}
                    onChangeText={setTalkingTargetAudience}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>商品卖点（可选）</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 60 }]}
                    placeholder="例如：IP67级防尘防水"
                    placeholderTextColor="#888"
                    value={talkingSellingPoint}
                    onChangeText={setTalkingSellingPoint}
                    multiline
                  />
                </Card>

                {/* ========== 口播稿 ========== */}
                <Card style={styles.promptCard}>
                  <Text style={styles.cardTitle}>🎙️ 口播稿 *</Text>
                  <TextInput
                    style={[styles.promptInput, { minHeight: 120 }]}
                    value={talkingScript}
                    onChangeText={setTalkingScript}
                    placeholder="视频长短取决于文案长短，最长 2000 字，每秒 16 点"
                    placeholderTextColor="#888"
                    multiline
                  />
                  {talkingScript.length > 0 && (
                    <Text style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>
                      {(() => {
                        const { scriptLength, estimatedSeconds, estimatedCost } = calcTalkingAgentCost(talkingScript);
                        return `口播稿 ${scriptLength} 字，预估 ${estimatedSeconds} 秒，预扣 ${estimatedCost} 点`;
                      })()}
                    </Text>
                  )}
                </Card>

                {/* ========== 视频设置 ========== */}
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>⚙️ 视频设置</Text>
                  
                  <Text style={styles.label}>分辨率</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    {['720p', '1080p'].map(res => (
                      <TouchableOpacity
                        key={res}
                        style={[
                          styles.durationButton,
                          talkingResolution === res && styles.durationButtonActive
                        ]}
                        onPress={() => setTalkingResolution(res)}
                      >
                        <Text style={[
                          styles.durationText,
                          talkingResolution === res && styles.durationTextActive
                        ]}>{res}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>画幅</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    {['9:16', '16:9'].map(ratio => (
                      <TouchableOpacity
                        key={ratio}
                        style={[
                          styles.durationButton,
                          talkingAspectRatio === ratio && styles.durationButtonActive
                        ]}
                        onPress={() => setTalkingAspectRatio(ratio)}
                      >
                        <Text style={[
                          styles.durationText,
                          talkingAspectRatio === ratio && styles.durationTextActive
                        ]}>{ratio === '9:16' ? '竖屏 9:16' : '横屏 16:9'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 13 }}>允许系统润色口播文案</Text>
                      <Switch
                        value={talkingAllowPolish}
                        onValueChange={setTalkingAllowPolish}
                        style={{ marginLeft: 6 }}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 13 }}>添加背景音乐</Text>
                      <Switch
                        value={talkingBgmEnabled}
                        onValueChange={setTalkingBgmEnabled}
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </View>
                </Card>

                {/* ========== 生成按钮 ========== */}
                <TouchableOpacity
                  onPress={generateTalkingAgent}
                  disabled={talkingLoading}
                  style={styles.generateButton}
                >
                  {talkingLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.generateText}>
                      生成口播视频
                      {talkingScript.length > 0 && `（预扣 ${calcTalkingAgentCost(talkingScript).estimatedCost} 点）`}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {activeTab === 'multi' && (
              <>
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
                <TouchableOpacity onPress={generateMultiAngle} disabled={multiLoading} style={styles.generateButton}>
                  {multiLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始多角度合成</Text>}
                </TouchableOpacity>
              </>
            )}

            {/* activeTab === 'size' && (
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
            ) */}


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
                <Text style={{ color: '#ff6b6b', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                  请遵守平台规范，勿生成违法违规、色情暴力、政治敏感等不当内容
                </Text>
              </Card>
            )}

            {activeTab === 'video' && (
              <>
                {/* ========== 模型选择 ========== */}
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>🎯 选择模型</Text>
                  <View style={styles.durationRow}>
                    <TouchableOpacity
                      style={[styles.durationButton, videoModel === '2.6' && styles.durationButtonActive]}
                      onPress={() => {
                        setVideoModel('2.6');
                        setVideoSound('off'); // 2.6强制无声
                        if (duration === 15) setDuration(10); // 2.6不支持15秒
                      }}
                    >
                      <Text style={[styles.durationText, videoModel === '2.6' && styles.durationTextActive]}>
                        2.6 基础版                      </Text>
                      <Text style={[styles.durationSubtext, videoModel === '2.6' && styles.durationTextActive]}>
                        无声 · 25-50点
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.durationButton, videoModel === '3.0' && styles.durationButtonActive]}
                      onPress={() => setVideoModel('3.0')}
                    >
                      <Text style={[styles.durationText, videoModel === '3.0' && styles.durationTextActive]}>
                        3.0 增强版
                      </Text>
                      <Text style={[styles.durationSubtext, videoModel === '3.0' && styles.durationTextActive]}>
                        有声/无声 · 45-180点
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                {/* ========== 声音选择（仅3.0显示） ========== */}
                {videoModel === '3.0' && (
                  <Card style={styles.inputCard}>
                    <Text style={styles.cardTitle}>🔊 声音模式</Text>
                    <View style={styles.durationRow}>
                      <TouchableOpacity
                        style={[styles.durationButton, videoSound === 'off' && styles.durationButtonActive]}
                        onPress={() => setVideoSound('off')}
                      >
                        <Text style={[styles.durationText, videoSound === 'off' && styles.durationTextActive]}>
                          无声
                        </Text>
                        <Text style={[styles.durationSubtext, videoSound === 'off' && styles.durationTextActive]}>
                          45-135点
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.durationButton, videoSound === 'native' && styles.durationButtonActive]}
                        onPress={() => setVideoSound('native')}
                      >
                        <Text style={[styles.durationText, videoSound === 'native' && styles.durationTextActive]}>
                          有声
                        </Text>
                        <Text style={[styles.durationSubtext, videoSound === 'native' && styles.durationTextActive]}>
                          60-180点
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                )}

                {/* ========== 时长选择 ========== */}
                <Card style={styles.inputCard}>
                  <Text style={styles.cardTitle}>⏱️ 视频时长</Text>
                  <View style={styles.durationRow}>
                    {videoModel === '2.6' ? (
                      // 2.6：只有5秒和10秒
                      [5, 10].map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.durationButton, duration === sec && styles.durationButtonActive]}
                          onPress={() => setDuration(sec)}
                        >
                          <Text style={[styles.durationText, duration === sec && styles.durationTextActive]}>
                            {sec}秒
                          </Text>
                          <Text style={[styles.durationSubtext, duration === sec && styles.durationTextActive]}>
                            {sec === 5 ? '25点' : '50点'}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      // 3.0：5秒、10秒、15秒
                      [5, 10, 15].map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.durationButton, duration === sec && styles.durationButtonActive]}
                          onPress={() => setDuration(sec)}
                        >
                          <Text style={[styles.durationText, duration === sec && styles.durationTextActive]}>
                            {sec}秒
                          </Text>
                          <Text style={[styles.durationSubtext, duration === sec && styles.durationTextActive]}>
                            {videoSound === 'off' 
                              ? (sec === 5 ? '45点' : sec === 10 ? '90点' : '135点')
                              : (sec === 5 ? '60点' : sec === 10 ? '120点' : '180点')
                            }
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </Card>
              </>
            )}

            {/* activeTab === 'size' && (
              <TouchableOpacity onPress={recommendSize} disabled={sizeLoading} style={styles.generateButton}>
                {sizeLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始尺码推荐</Text>}
              </TouchableOpacity>
            ) */}

            {activeTab === 'image' && (
              <TouchableOpacity onPress={generateImage} disabled={imageLoading} style={styles.generateButton}>
                {imageLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.generateText}>
                    {selectedImage ? '开始生成图片（图生图）' : '开始生成图片（文生图）'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {activeTab === 'video' && (
              <TouchableOpacity onPress={generateVideo} disabled={videoLoading} style={styles.generateButton}>
                {videoLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.generateText}>开始生成视频（{getVideoPrice()}点）</Text>
                )}
              </TouchableOpacity>
            )}

            {activeTab === 'tryon' && (
              <TouchableOpacity onPress={generateTryon} disabled={tryonLoading} style={styles.generateButton}>
                {tryonLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateText}>开始虚拟试穿</Text>}
              </TouchableOpacity>
            )}

            {/* ========== 商家工作台页面（新：电商套图） ========== */}
            {activeTab === 'merchant' && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <View style={styles.profileHeaderBar}>
                    <View style={{ width: 40 }} />
                    <Text style={styles.headerTitle}>📦 电商商品套图</Text>
                    <TouchableOpacity onPress={() => setActiveTab('profile')} style={styles.menuButton}>
                      <Icon name="close-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* ========== 上传商品图 ========== */}
                  <Card style={styles.imageCard}>
                    <Text style={styles.cardTitle}>📸 上传商品图</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const files = Array.from(e.target.files);
                          if (files.length > 0) {
                            setMerchantImages([files[0]]);
                          }
                        };
                        input.click();
                      }}
                      style={styles.imagePicker}
                    >
                      {merchantImages.length > 0 ? (
                        <View style={{ width: '100%', height: 200, position: 'relative' }}>
                          <Image
                            source={{ uri: URL.createObjectURL(merchantImages[0]) }}
                            style={{ width: '100%', height: 200, resizeMode: 'contain' }}
                          />
                          <View style={styles.imageOverlay}>
                            <Text style={styles.overlayText}>点击更换</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.placeholder}>
                          <Icon name="cloud-upload-outline" size={48} color="#666" />
                          <Text style={styles.placeholderText}>点击上传商品图</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.iconButton} onPress={pickMerchantImages}>
                        <Icon name="images-outline" size={20} color="#fff" />
                        <Text style={styles.iconButtonText}>相册</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconButton} onPress={takeMerchantPhoto}>
                        <Icon name="camera-outline" size={20} color="#fff" />
                        <Text style={styles.iconButtonText}>拍照</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  {/* ========== 商品信息（可选） ========== */}
                  <Card style={[styles.inputCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    {/* 标题行 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S(16) }}>
                      <Text style={[styles.cardTitle, { fontSize: S(16) }]}>💬 商品信息（可选）</Text>
                      <Text style={{ color: '#888', fontSize: S(13), textAlign: 'right' }}>AI 会根据图片自动分析</Text>
                    </View>

                    {/* ========== 卖点 - 独占一行，大输入框 ========== */}
                    <Text style={{ color: '#fff', fontSize: S(16), fontWeight: 'bold', marginBottom: S(8) }}>
                      卖点
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#2d2d44',
                        borderRadius: S(12),
                        padding: S(14),
                        color: '#fff',
                        fontSize: S(15),
                        height: S(180),
                        width: '100%',
                        textAlignVertical: 'top',
                        marginBottom: S(16),
                      }}
                      placeholder="例如：防水、轻便、大容量、耐用、时尚、百搭"
                      placeholderTextColor="#888"
                      value={suiteSellingPoints}
                      onChangeText={setSuiteSellingPoints}
                      multiline
                    />

                    {/* ========== 使用方式/销售地区/发布平台 - 横向三个 ========== */}
                    <View style={{ flexDirection: 'row', gap: S(12) }}>
                      {/* 使用方式 */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: S(14), fontWeight: 'bold', marginBottom: S(6) }}>
                          使用方式
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: '#2d2d44',
                            borderRadius: S(12),
                            padding: S(10),
                            color: '#fff',
                            fontSize: S(14),
                            height: S(50),
                            width: '100%',
                          }}
                          placeholder="露营、野餐"
                          placeholderTextColor="#888"
                          value={suiteUsage}
                          onChangeText={setSuiteUsage}
                        />
                      </View>

                      {/* 销售地区 */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: S(14), fontWeight: 'bold', marginBottom: S(6) }}>
                          销售地区
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: '#2d2d44',
                            borderRadius: S(12),
                            padding: S(10),
                            color: '#fff',
                            fontSize: S(14),
                            height: S(50),
                            width: '100%',
                          }}
                          placeholder="美国、日本"
                          placeholderTextColor="#888"
                          value={suiteRegion}
                          onChangeText={setSuiteRegion}
                        />
                      </View>

                      {/* 发布平台 */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: S(14), fontWeight: 'bold', marginBottom: S(6) }}>
                          发布平台
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: '#2d2d44',
                            borderRadius: S(12),
                            padding: S(10),
                            color: '#fff',
                            fontSize: S(14),
                            height: S(50),
                            width: '100%',
                          }}
                          placeholder="亚马逊"
                          placeholderTextColor="#888"
                          value={suitePlatform}
                          onChangeText={setSuitePlatform}
                        />
                      </View>
                    </View>
                  </Card>

                  {/* ========== 套图类型 ========== */}
                  <Card style={[styles.inputCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <Text style={styles.cardTitle}>🎨 套图类型</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.durationButton,
                          suiteType === 'white_bg' && styles.durationButtonActive
                        ]}
                        onPress={() => setSuiteType('white_bg')}
                      >
                        <Text style={[
                          styles.durationText,
                          suiteType === 'white_bg' && styles.durationTextActive
                        ]}>白底图</Text>
                        <Text style={{ fontSize: 10, color: suiteType === 'white_bg' ? '#fff' : '#888', marginTop: 2 }}>
                          10点
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.durationButton,
                          suiteType === 'scene' && styles.durationButtonActive
                        ]}
                        onPress={() => setSuiteType('scene')}
                      >
                        <Text style={[
                          styles.durationText,
                          suiteType === 'scene' && styles.durationTextActive
                        ]}>场景图</Text>
                        <Text style={{ fontSize: 10, color: suiteType === 'scene' ? '#fff' : '#888', marginTop: 2 }}>
                          15点/张
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.durationButton,
                          suiteType === 'aplus' && styles.durationButtonActive
                        ]}
                        onPress={() => setSuiteType('aplus')}
                      >
                        <Text style={[
                          styles.durationText,
                          suiteType === 'aplus' && styles.durationTextActive
                        ]}>A+图</Text>
                        <Text style={{ fontSize: 10, color: suiteType === 'aplus' ? '#fff' : '#888', marginTop: 2 }}>
                          50点
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 场景数量 */}
                    {suiteType === 'scene' && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ color: '#fff', fontSize: S(14), fontWeight: 'bold', marginBottom: S(8) }}>
                          场景数量
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {[2, 4, 6].map(n => (
                            <TouchableOpacity
                              key={n}
                              style={[
                                styles.durationButton,
                                suiteSceneCount === n && styles.durationButtonActive
                              ]}
                              onPress={() => setSuiteSceneCount(n)}
                            >
                              <Text style={[
                                styles.durationText,
                                suiteSceneCount === n && styles.durationTextActive
                              ]}>{n}张</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* A+图数量 - 移到这里，Card 内 */}
                    {suiteType === 'aplus' && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ color: '#fff', fontSize: S(14), fontWeight: 'bold', marginBottom: S(8) }}>
                          A+图数量
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {[2, 4, 6].map(n => (
                            <TouchableOpacity
                              key={n}
                              style={[
                                styles.durationButton,
                                suiteAplusCount === n && styles.durationButtonActive
                              ]}
                              onPress={() => setSuiteAplusCount(n)}
                            >
                              <Text style={[
                                styles.durationText,
                                suiteAplusCount === n && styles.durationTextActive
                              ]}>{n}张</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </Card>

                  {/* ========== 费用提示 ========== */}
                  <Text style={{ color: '#f59e0b', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                    预计消耗：{suiteType === 'white_bg' ? '10' : suiteType === 'scene' ? suiteSceneCount * 15 : suiteAplusCount * 50} 灵境点
                  </Text>

                  {/* ========== 生成按钮 ========== */}
                  <TouchableOpacity
                    onPress={generateSuite}
                    disabled={suiteLoading || merchantImages.length === 0}
                    style={[styles.generateButton, merchantImages.length === 0 && { opacity: 0.5 }]}
                  >
                    {suiteLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.generateText}>开始生成商品套图</Text>
                    )}
                  </TouchableOpacity>

                  {/* ========== 生成结果 ========== */}
                  {suiteResult && suiteResult.images && suiteResult.images.length > 0 && (
                    <Card style={styles.resultCard}>
                      <Text style={styles.resultTitle}>🎉 生成结果（{suiteResult.images.length}张）</Text>

                      {/* AI 分析结果 */}
                      {suiteResult.analysis && (
                        <View style={{ backgroundColor: '#1e1e2e', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>
                            <Text style={{ fontWeight: 'bold' }}>商品名：</Text>
                            {suiteResult.analysis.product_name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>
                            <Text style={{ fontWeight: 'bold' }}>材质：</Text>
                            {suiteResult.analysis.material}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>
                            <Text style={{ fontWeight: 'bold' }}>适用场景：</Text>
                            {suiteResult.analysis.scenes?.join('、')}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#fff' }}>
                            <Text style={{ fontWeight: 'bold' }}>核心卖点：</Text>
                            {suiteResult.analysis.selling_points?.join('、')}
                          </Text>
                        </View>
                      )}

                      {/* 图片列表 */}
                      {suiteResult.images.map((img, i) => {
                        const displayUrl = typeof img === 'string' ? img : img.watermarked;
                        return (
                          <View key={i} style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Image
                              source={{ uri: displayUrl }}
                              style={{ width: '100%', height: 300, resizeMode: 'contain' }}
                              onClick={() => { setPreviewUrl(displayUrl); setModalVisible(true); }}
                            />
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, width: '100%' }}>
                              <TouchableOpacity
                                onPress={() => downloadSuiteImage(displayUrl)}
                                style={{
                                  flex: 1,
                                  backgroundColor: '#10b981',
                                  borderRadius: 8,
                                  paddingVertical: 10,
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                                  带水印下载
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  const token = localStorage.getItem('access_token');
                                  const downloadUrl = `${API_URL}/merchant/download_clean_file/${suiteResult.historyId}/${i}?token=${token}`;
                                  downloadSuiteImage(downloadUrl);
                                }}
                                style={{
                                  flex: 1,
                                  backgroundColor: '#f59e0b',
                                  borderRadius: 8,
                                  paddingVertical: 10,
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                                  无水印下载
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </Card>
                  )}
                </View>
              </ScrollView>
            )}
            {renderResult()}

            {history.length > 0 && (
              <Card style={styles.historyCard}>
                <Text style={styles.cardTitle}>📜 历史记录</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {history.map((item) => (
                    <View key={item.id} style={styles.historyItemContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          if (item.type.startsWith('视频生成') || item.type === '虚拟试穿' || item.type === '数字人分身' || item.type === '口播带货' || item.type === '多角度试穿') {
                            setCurrentVideoUrl(item.url);
                            setVideoModalVisible(true);
                          } else if (item.type === '图片生成') {
                            setSelectedImage(null);
                            setModelImage(null);
                            setGarmentImage(null);
                            setDigitalImage(null);
                            setResult({ images: [{ url: item.url }] });
                            setActiveTab('image');
                          } else if (item.type === '电商商品套图') {
                            try {
                              const urls = JSON.parse(item.url);
                              if (Array.isArray(urls) && urls.length > 0) {
                                  const watermarkedUrls = urls.map(u => typeof u === 'string' ? u : u.watermarked);
                                  setSuiteResult({
                                      images: watermarkedUrls,
                                      analysis: null,
                                      historyId: item.id,
                                  });
                                  setActiveTab('merchant');
                              } else {
                                // 兼容旧格式
                                setCurrentVideoUrl(item.url);
                                setVideoModalVisible(true);
                              }
                            } catch(e) {
                              console.error('解析电商套图URL失败:', e);
                              setCurrentVideoUrl(item.url);
                              setVideoModalVisible(true);
                            }

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
                            bottom: 2,
                            right: 2,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            paddingHorizontal: 3,
                            paddingVertical: 1,
                            borderRadius: 2,
                          }}>
                            <Text style={{ color: '#fff', fontSize: 8 }}>AI生成</Text>
                          </View>
                        </View>
                        <Text style={styles.historyText}>{item.type}</Text>
                        <Text style={styles.historyTime}>{item.timestamp}</Text>
                      </TouchableOpacity>

                      {/* ✅ 新增：下载按钮 */}
                      <TouchableOpacity
                        style={styles.historyDownloadBtn}
                        onPress={async (e) => {
                          e.stopPropagation();

                          // ========== 电商商品套图下载（新增） ==========  
                          if (item.type === '电商商品套图') {
                            try {
                              const urls = JSON.parse(item.url);
                              let firstUrl = item.url;
                              if (Array.isArray(urls) && urls.length > 0) {
                                const first = urls[0];
                                firstUrl = typeof first === 'string' ? first : (first.watermarked || first.clean);
                              }
                              const downloadFileName = `AI_电商套图_${Date.now()}.png`;

                              // 鸿蒙
                              if (window.harmonyBridge?.saveFile) {
                                window.harmonyBridge.saveFile(firstUrl, downloadFileName);
                                showToast('正在下载...');
                                return;
                              }
                              // iOS
                              if (navigator.platform.indexOf('iPhone') !== -1 || navigator.platform.indexOf('iPad') !== -1) {
                                try {
                                  const downloadBlob = await addWatermarkToImage(firstUrl);
                                  const base64 = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                    reader.readAsDataURL(downloadBlob);
                                  });
                                  const { Filesystem, Directory } = await import('@capacitor/filesystem');
                                  const result = await Filesystem.writeFile({
                                    path: downloadFileName,
                                    data: base64,
                                    directory: Directory.Cache,
                                  });
                                  const { Share } = await import('@capacitor/share');
                                  await Share.share({
                                    title: downloadFileName,
                                    url: result.uri,
                                    dialogTitle: '保存文件',
                                  });
                                  showToast('已打开分享菜单');
                                } catch (e) {
                                  console.error('iOS 保存失败:', e);
                                  showToast('保存失败，请重试', true);
                                }
                                return;
                              }
                              // 安卓：加水印
                              if (/android/i.test(navigator.userAgent)) {
                                try {
                                  const blob = await addWatermarkToImage(firstUrl);
                                  const base64 = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                    reader.readAsDataURL(blob);
                                  });
                                  await Filesystem.writeFile({ path: downloadFileName, data: base64, directory: Directory.Documents });
                                  showToast('图片已保存');
                                } catch (e) { showToast('保存失败'); }
                                return;
                              }
                              // Web：加水印后下载
                              const blob = await addWatermarkToImage(firstUrl);
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = downloadFileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              showToast('正在下载...');
                              return;
                            } catch(e) {
                              showToast('下载失败', true);
                              return;
                            }
                          }
                          
                          const isVideo = item.type.startsWith('视频生成') || 
                                          item.type === '虚拟试穿' || 
                                          item.type === '数字人分身' || 
                                          item.type === '口播带货' || 
                                          item.type === '多角度试穿';
                          const extension = isVideo ? 'mp4' : 'png';
                          const fileName = `${item.type}_${Date.now()}.${extension}`;
                          
                          // 鸿蒙
                          if (window.harmonyBridge?.saveFile) {
                            window.harmonyBridge.saveFile(item.url, fileName);
                            showToast('正在下载...');
                            return;
                          }
                          
                          // iOS
                          if (navigator.platform.indexOf('iPhone') !== -1 || navigator.platform.indexOf('iPad') !== -1) {
                            try {
                              const downloadBlob = await (await fetch(item.url)).blob();
                              const base64 = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                reader.readAsDataURL(downloadBlob);
                              });
                              const { Filesystem, Directory } = await import('@capacitor/filesystem');
                              const result = await Filesystem.writeFile({
                                path: fileName,
                                data: base64,
                                directory: Directory.Cache,
                              });
                              const { Share } = await import('@capacitor/share');
                              await Share.share({
                                title: fileName,
                                url: result.uri,
                                dialogTitle: '保存文件',
                              });
                              showToast('已打开分享菜单');
                            } catch (e) {
                              console.error('iOS 保存失败:', e);
                              showToast('保存失败，请重试', true);
                            }
                            return;
                          }
                          
                          // 安卓 App 内下载
                          if (/android/i.test(navigator.userAgent)) {
                            if (!isVideo) {
                              try {
                                const blob = await addWatermarkToImage(item.url);
                                const base64 = await new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                  reader.readAsDataURL(blob);
                                });
                                await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents });
                                showToast('图片已保存');
                              } catch (e) {
                                showToast('保存失败');
                              }
                              return;
                            }
                            
                            const response = await fetch(item.url);
                            const blob = await response.blob();
                            const base64 = await new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result.split(',')[1]);
                              reader.readAsDataURL(blob);
                            });
                            await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents });
                            showToast('视频已保存到内部存储/Documents');
                            return;
                          }
                          // 其他平台
                          const res = await fetch(item.url);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Icon name="download-outline" size={16} color="#10b981" />
                        <Text style={styles.downloadBtnText}>下载</Text>
                      </TouchableOpacity>
                      
                      {/* 删除按钮 */}
                      <TouchableOpacity
                        style={styles.historyDownloadBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                      >
                        <Icon name="trash-outline" size={16} color="#ef4444" />
                        <Text style={[styles.downloadBtnText, { color: '#ef4444' }]}>删除</Text>
                      </TouchableOpacity>

                      {/* 举报按钮 */}
                      <TouchableOpacity
                        style={styles.historyDownloadBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          const token = localStorage.getItem('access_token');
                          axios.post(`${API_URL}/history/report/${item.id}`, {}, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          }).then(() => {
                            showToast('举报已提交，我们会尽快处理');
                          }).catch(() => {
                            showToast('举报失败，请重试', true);
                          });
                        }}
                      >
                        <Icon name="flag-outline" size={14} color="#f59e0b" />
                        <Text style={[styles.downloadBtnText, { color: '#f59e0b' }]}>举报</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </Card>
            )}
          </ScrollView>
        )}


        {/* 我的页面 - 单独放在外面 */}
        {activeTab === 'profile' && (
          <ScrollView style={{ flex: 1 }}>
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
                  <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={(e) => { e.stopPropagation(); setShowSidebarMenu(false); }} />
                  <View style={styles.dropdownMenu}>
                    <View style={styles.dropdownUserInfo}>
                      <Icon name="person-circle" size={50} color="#7c3aed" />
                      <Text style={styles.dropdownUserName}>{isLoggedIn ? (loginPhone || '用户') : '未登录'}</Text>
                      {isLoggedIn && <Text style={styles.dropdownUserPhone}>{loginPhone}</Text>}
                    </View>
                    <View style={styles.dropdownCredits}>
                      <Text style={styles.dropdownCreditsLabel}>灵境点余额</Text>
                      <TouchableOpacity 
                        onPress={() => setShowRechargeModal(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Text style={styles.dropdownCreditsValue}>{userCredits}</Text>
                        <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: '600' }}>充值</Text>
                      </TouchableOpacity>
                    </View>
                  
                    <Text style={[styles.dropdownSectionTitle, { color: '#aaa' }]}>我的数字人</Text>
                    {digitalHumans.filter(d => !d.is_default).map(human => (
                      <View key={human.id} style={styles.dropdownHumanItem}>
                        <Text style={{ color: '#fff' }}>{human.name}</Text>
                        <Text style={{ color: '#aaa' }}>{human.is_active ? '✅' : '⏳'}</Text>
                      </View>
                    ))}
                    <TouchableOpacity 
                      onPress={() => {
                        setShowSidebarMenu(false);
                        showToast('请联系QQ：3060302415 或 拨打：15920978058');
                      }}
                      style={{ 
                        backgroundColor: '#2d2d44', 
                        borderRadius: S(12), 
                        padding: S(16),
                        marginBottom: S(12),
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: S(15), fontWeight: 'bold', marginBottom: S(6) }}>
                        💬 帮助与客服
                      </Text>
                      <Text style={{ color: '#999', fontSize: S(12), marginBottom: S(10) }}>
                        点击下方联系客服
                      </Text>
                      <View style={{ flexDirection: 'row', gap: S(10) }}>
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('3060302415');
                            showToast('✅ QQ已复制');
                          }}
                          style={{ flex: 1, backgroundColor: '#3b3b5c', borderRadius: S(8), padding: S(10), alignItems: 'center' }}
                        >
                          <Text style={{ color: '#7c3aed', fontSize: S(13) }}>QQ 3060302415</Text>
                          <Text style={{ color: '#666', fontSize: S(10) }}>点击复制</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('15920978058');
                            showToast('手机号已复制，请到拨号盘拨打');
                          }}
                          style={{ flex: 1, backgroundColor: '#3b3b5c', borderRadius: S(8), padding: S(10), alignItems: 'center' }}
                        >
                          <Text style={{ color: '#10b981', fontSize: S(13) }}>📞 15920978058</Text>
                          <Text style={{ color: '#666', fontSize: S(10) }}>点击复制</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    {isLoggedIn && (
                      <>
                        <TouchableOpacity onPress={handleLogout} style={{ marginTop: 12, alignSelf: 'flex-start', paddingRight: 20 }}>
                          <Text style={{ color: '#ef4444' }}>退出登录</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={{ marginTop: 8, alignSelf: 'flex-start', paddingRight: 20 }}>
                          <Text style={{ color: '#ff6666', fontSize: 12 }}>注销账户</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', marginTop: 12 }}>
                          <TouchableOpacity onPress={() => { setShowSidebarMenu(false); Linking.openURL('https://media.lingjing-media.com/privact.html'); }}>
                            <Text style={{ color: '#888', fontSize: 12 }}>隐私政策</Text>
                          </TouchableOpacity>
                          <Text style={{ color: '#888', fontSize: 12, marginHorizontal: 6 }}>|</Text>
                          <TouchableOpacity onPress={() => { setShowSidebarMenu(false); Linking.openURL('https://media.lingjing-media.com/terms.html'); }}>
                            <Text style={{ color: '#888', fontSize: 12 }}>用户协议</Text>
                          </TouchableOpacity>
                        </View>
                      </>
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
                  {/* ========== 新增：未登录也可充值 ========== */}
                  <TouchableOpacity style={[styles.loginButton, { backgroundColor: '#f59e0b', marginTop: 10 }]} onPress={() => setShowRechargeModal(true)}>
                    <Text style={styles.loginButtonText}>购买灵境点</Text>
                  </TouchableOpacity>

                </View>
              )}
            </View>
          </ScrollView>
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
                      {loginCountdown > 0 ? `${loginCountdown}s` : '获取验证码'}
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
              {/* 隐私政策复选框 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <input type="checkbox" id="loginAgree" style={{ width: 16, height: 16, marginRight: 6, accentColor: '#7c3aed' }} />
                <Text style={{ color: '#888', fontSize: 12 }}>
                  我已阅读并同意
                  <Text style={{ color: '#7c3aed' }} onPress={() => Linking.openURL('https://media.lingjing-media.com/privact.html')}>《隐私政策》</Text>
                  和
                  <Text style={{ color: '#7c3aed' }} onPress={() => Linking.openURL('https://media.lingjing-media.com/terms.html')}>《用户协议》</Text>
                </Text>
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
              {/* 隐私政策链接 */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                <TouchableOpacity onPress={() => Linking.openURL('https://media.lingjing-media.com/privact.html')}>
                  <Text style={{ color: '#888', fontSize: 12 }}>《隐私政策》</Text>
                </TouchableOpacity>
                <Text style={{ color: '#888', fontSize: 12, marginHorizontal: 4 }}>|</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://media.lingjing-media.com/terms.html')}>
                  <Text style={{ color: '#888', fontSize: 12 }}>《用户协议》</Text>
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
                      <Text style={styles.getCodeText}>
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </Text>
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
                  {/* 隐私政策复选框 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
                    <input type="checkbox" id="registerAgree" style={{ width: 16, height: 16, marginRight: 6, accentColor: '#7c3aed' }} />
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      我已阅读并同意
                      <Text style={{ color: '#7c3aed' }} onPress={() => Linking.openURL('https://media.lingjing-media.com/privact.html')}>《隐私政策》</Text>
                      和
                      <Text style={{ color: '#7c3aed' }} onPress={() => Linking.openURL('https://media.lingjing-media.com/terms.html')}>《用户协议》</Text>
                    </Text>
                  </View>
                  <View style={styles.loginButtonRow}>
                    <TouchableOpacity onPress={() => setRegisterStep('code')} style={styles.loginCancelButton}>
                      <Text style={styles.loginButtonText}>上一步</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={completeRegister} style={styles.loginConfirmButton}>
                      <Text style={styles.loginButtonText}>完成注册</Text>
                    </TouchableOpacity>
                  </View>
                  {/* 隐私政策链接 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://media.lingjing-media.com/privact.html')}>
                      <Text style={{ color: '#888', fontSize: 12 }}>《隐私政策》</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#888', fontSize: 12, marginHorizontal: 4 }}>|</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://media.lingjing-media.com/terms.html')}>
                      <Text style={{ color: '#888', fontSize: 12 }}>《用户协议》</Text>
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
                    {resetCountdown > 0 ? `${resetCountdown}s` : '获取验证码'}
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
              </ScrollView>
            </Card>
          </View>
        </Modal>

        {/* ========== 支付方式选择弹窗 ========== */}
        <Modal visible={showPayMethodModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <Card style={{ padding: 24, width: '85%', maxWidth: 400, backgroundColor: '#1e1e2e', borderRadius: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                选择支付方式
              </Text>
              {pendingPkg && (
                <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  {pendingPkg.credits} 灵境点 · ¥{pendingPkg.price}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowPayMethodModal(false);
                  if (pendingPkg) handleWechatPay(pendingPkg);
                }}
                style={{
                  backgroundColor: '#07C160',
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                  微信支付
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowPayMethodModal(false);
                  if (pendingPkg) handleAlipay(pendingPkg);
                }}
                style={{
                  backgroundColor: '#1677FF',
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                  支付宝
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPayMethodModal(false)}
                style={{
                  backgroundColor: '#2d2d44',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#aaa', fontSize: 14 }}>取消</Text>
              </TouchableOpacity>
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
                  showToast('余额已更新');
                }}
                style={styles.closePaymentButton}
              >
                <Text style={styles.closePaymentText}>我已完成支付</Text>
              </TouchableOpacity>
            </Card>
          </View>
        </Modal>

        {/* 注销确认弹窗 */}
        <Modal visible={showDeleteConfirm} transparent={true} animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ backgroundColor: '#1e1e2e', borderRadius: 16, padding: 24, width: 300 }}>
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>注销账户</Text>
              <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>注销后所有数据将被永久删除，无法恢复。确定要注销吗？</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 12, backgroundColor: '#2d2d44', borderRadius: 8, marginRight: 8 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDeleteAccount} style={{ flex: 1, padding: 12, backgroundColor: '#ef4444', borderRadius: 8 }}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>确认注销</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                  if (activeTab === 'digital_custom') {
                    setTalkingLoading(true);
                  } else if (activeTab === 'digital') {
                    setDigitalLoading(true);
                  } else if (activeTab === 'video') {
                    setVideoLoading(true);
                  } else if (activeTab === 'image') {
                    setImageLoading(true);
                  } else if (activeTab === 'tryon') {
                    setTryonLoading(true);
                  } else if (activeTab === 'multi') {
                    setMultiLoading(true);
                  } else if (activeTab === 'merchant') {
                    setMerchantLoading(true);
                  }
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
          transparent={false}
          animationType="fade"
          onRequestClose={() => setVideoModalVisible(false)}
        >
          <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
            
            {/* 视频 - 铺满整个屏幕 */}
            <video
              ref={fullscreenVideoRef}
              src={currentVideoUrl}
              controls
              playsInline
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
              }}
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
              <TouchableOpacity onPress={() => setVideoModalVisible(false)} style={{ padding: 12}}>
                <Icon name="close" size={36} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* AI生成 - 右下角，视频内部 */}
            <View style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              zIndex: 10,
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>AI生成</Text>
            </View>

          </View>
        </Modal>

        {/* 图片全屏预览 Modal */}
        <Modal visible={modalVisible} transparent={true} animationType="fade">
          <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 12 }}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={40} color="#fff" />
            </TouchableOpacity>
            {previewUrl && (
              <View style={{ position: 'relative', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri: previewUrl }}
                  style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
                />
                <View style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>AI生成</Text>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* 形象预览视频 Modal */}
        <Modal
          visible={previewVideoVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setPreviewVideoVisible(false)}
        >
          <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
            
            {/* 视频 - 铺满整个屏幕 */}
            <video
              src={currentPreviewVideoUrl}
              controls
              playsInline
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
              }}
              onError={(e) => console.log('预览视频播放错误', e)}
            />

            {/* 标题栏 - 左上角 */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 60,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 30,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 10,
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>形象预览</Text>
              <TouchableOpacity onPress={() => setPreviewVideoVisible(false)} style={{ padding: 12 }}>
                <Icon name="close" size={36} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* 使用此形象按钮 */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 60,
                left: 40,
                right: 40,
                backgroundColor: '#7c3aed',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 30,
                zIndex: 10,
                alignItems: 'center',
              }}
              onPress={() => {
                const currentAvatar = presetAvatars.find(a => a.preview_video_url === currentPreviewVideoUrl);
                if (currentAvatar) {
                  setSelectedAvatarId(currentAvatar.id);
                  setDigitalImage({ uri: currentAvatar.model_image, isUrl: true });
                }
                setPreviewVideoVisible(false);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>使用此形象</Text>
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
      </View>   {/* 关闭 container */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingTop: Platform.OS === 'web' ? S(30) : S(50), paddingBottom: S(20), alignItems: 'center' },
  logo: { fontSize: S(36), fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  subtitle: { fontSize: S(14), color: '#aaa', marginTop: S(4) },
  tabContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', backgroundColor: '#1a1a2e', marginHorizontal: S(20), marginVertical: S(15), borderRadius: S(40), paddingVertical: S(8) },
  tab: { alignItems: 'center', paddingVertical: S(8), paddingHorizontal: S(8), borderRadius: S(30), flexShrink: 0 },
  activeTab: { backgroundColor: 'rgba(124,58,237,0.2)' },
  tabText: { fontSize: S(12), marginTop: S(4), color: '#888', fontWeight: '500' },
  content: { paddingHorizontal: S(20), paddingBottom: S(40) },
  card: { backgroundColor: '#1e1e2e', borderRadius: S(24), padding: S(20), marginBottom: S(20), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: S(12), elevation: 8 },
  imageCard: { alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: S(16) },
  deleteButton: { padding: S(4) },
  cardTitle: { fontSize: S(18), fontWeight: '600', color: '#fff', marginBottom: S(16), alignSelf: 'flex-start' },
  imagePicker: { width: '100%', height: S(200), borderRadius: S(16), overflow: 'hidden', backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center', marginBottom: S(16), position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: S(8), alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: S(12) },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#aaa', marginTop: S(8) },
  buttonRow: { flexDirection: 'row', gap: 16 },
  iconButton: { flexDirection: 'row', backgroundColor: '#3b3b5c', paddingVertical: S(10), paddingHorizontal: S(20), borderRadius: S(30), alignItems: 'center', gap: 8 },
  iconButtonText: { color: '#fff', fontSize: S(14) },
  inputCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heightInput: { backgroundColor: '#2d2d44', borderRadius: S(12), paddingVertical: S(12), paddingHorizontal: S(16), width: S(100), color: '#fff', fontSize: S(16), textAlign: 'center' },
  heightUnit: { color: '#aaa', fontSize: S(14) },
  durationRow: { flexDirection: 'row', gap: 12 },
  durationButton: { paddingVertical: S(8), paddingHorizontal: S(16), borderRadius: S(20), backgroundColor: '#2d2d44' },
  durationButtonActive: { backgroundColor: '#7c3aed' },
  durationText: { color: '#aaa', fontSize: S(14) },
  durationTextActive: { color: '#fff' },
  voiceRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  voiceButton: { paddingVertical: S(8), paddingHorizontal: S(16), borderRadius: S(20), backgroundColor: '#2d2d44' },
  voiceButtonActive: { backgroundColor: '#7c3aed' },
  voiceText: { color: '#aaa', fontSize: S(14) },
  voiceTextActive: { color: '#fff' },
  promptCard: { padding: S(20) },
  promptInput: { backgroundColor: '#2d2d44', borderRadius: S(12), padding: S(12), color: '#fff', fontSize: S(14), minHeight: S(80), textAlignVertical: 'top' },
  generateButton: { backgroundColor: '#7c3aed', borderRadius: S(40), paddingVertical: S(16), alignItems: 'center', marginBottom: S(24) },
  generateText: { color: '#fff', fontSize: S(18), fontWeight: 'bold' },
  resultCard: { alignItems: 'center' },
  resultTitle: { fontSize: S(20), fontWeight: 'bold', color: '#fff', marginBottom: S(16) },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: S(20) },
  sizeItem: { alignItems: 'center' },
  sizeLabel: { color: '#aaa', fontSize: S(14), marginBottom: S(4) },
  sizeValue: { color: '#fff', fontSize: S(24), fontWeight: 'bold' },
  recommendSize: { fontSize: S(18), color: '#7c3aed', fontWeight: '600', marginTop: S(8) },
  resultImage: { width: width * 0.7, height: width * 0.7, borderRadius: S(16), marginTop: S(10) },
  linkText: { color: '#7c3aed', fontSize: S(12), marginTop: S(8), textDecorationLine: 'underline' },
  urlRow: { flexDirection: 'row', alignItems: 'center', marginTop: S(8), width: '100%', gap: 8 },
  copyButton: { padding: S(8), backgroundColor: '#2d2d44', borderRadius: S(8) },
  historyCard: { marginTop: S(10), minHeight: S(250) },
  historyItem: { marginRight: S(15), alignItems: 'center', width: S(100) },
  historyImage: { width: S(80), height: S(80), borderRadius: S(8), backgroundColor: '#2d2d44' },
  historyText: { color: '#aaa', fontSize: S(10), marginTop: S(4), textAlign: 'center' },
  historyTime: { color: '#666', fontSize: S(8), marginTop: S(2) },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: S(50), right: S(20), zIndex: 10, padding: S(10) },
  modalImage: { width: width * 0.9, height: height * 0.7 },
  toast: { position: 'absolute', bottom: S(100), left: S(20), right: S(20), backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: S(30), paddingVertical: S(12), paddingHorizontal: S(20), alignItems: 'center', zIndex: 1000 },
  toastText: { color: '#fff', fontSize: S(14) },
  multiImageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: S(10) },
  multiImageItem: { position: 'relative' },
  multiPreview: { width: S(80), height: S(80), borderRadius: S(12), backgroundColor: '#2d2d44' },
  removeMultiImage: { position: 'absolute', top: S(-8), right: S(-8) },
  addImageButton: { width: S(80), height: S(80), borderRadius: S(12), backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  addImageText: { color: '#aaa', fontSize: S(10), marginTop: S(4) },
  loginCard: { width: '90%', padding: S(20) },
  loginInput: { backgroundColor: '#2d2d44', borderRadius: S(8), padding: S(12), color: '#fff', marginBottom: S(12) },
  loginButtonRow: { flexDirection: 'row', gap: 12, marginTop: S(12) },
  loginCancelButton: { flex: 1, backgroundColor: '#3b3b5c', borderRadius: S(8), paddingVertical: S(12), alignItems: 'center' },
  loginConfirmButton: { flex: 1, backgroundColor: '#7c3aed', borderRadius: S(8), paddingVertical: S(12), alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: S(16), fontWeight: 'bold' },
  registerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S(16),
  },
  registerLinkText: {
    color: '#aaa',
    fontSize: S(14),
  },
  registerLink: {
    color: '#7c3aed',
    fontSize: S(14),
    marginLeft: S(4),
  },
  profileCard: { alignItems: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: S(20) },
  profileInfo: { marginLeft: S(15) },
  profileName: { fontSize: S(20), fontWeight: 'bold', color: '#fff' },
  profilePhone: { color: '#aaa', marginTop: S(4) },
  creditsCard: { backgroundColor: '#7c3aed', borderRadius: S(16), padding: S(20), width: '100%', alignItems: 'center', marginBottom: S(20) },
  creditsLabel: { color: '#ddd', fontSize: S(14) },
  creditsValue: { color: '#fff', fontSize: S(36), fontWeight: 'bold', marginTop: S(8) },
  rechargeButton: { backgroundColor: '#10b981', borderRadius: S(30), paddingVertical: S(12), paddingHorizontal: S(30), marginBottom: S(12) },
  rechargeButtonText: { color: '#fff', fontSize: S(16), fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: S(30), paddingVertical: S(12), paddingHorizontal: S(30) },
  logoutButtonText: { color: '#fff', fontSize: S(16), fontWeight: 'bold' },
  loginPrompt: { alignItems: 'center', paddingVertical: S(40) },
  loginPromptText: { color: '#aaa', fontSize: S(16), marginTop: S(16), marginBottom: S(24) },
  loginButton: { backgroundColor: '#7c3aed', borderRadius: S(30), paddingVertical: S(12), paddingHorizontal: S(40) },
  profileHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S(16),
    paddingVertical: S(12),
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  menuButton: { padding: S(8) },
  headerTitle: { fontSize: S(18), fontWeight: 'bold', color: '#fff' },
  profileContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S(20) },
  welcomeText: { fontSize: S(20), fontWeight: 'bold', color: '#fff', marginBottom: S(8) },
  welcomeSubText: { fontSize: S(14), color: '#aaa' },
  loginModeRow: { flexDirection: 'row', marginBottom: S(16), borderRadius: S(8), overflow: 'hidden', borderWidth: 1, borderColor: '#3b3b5c' },
  loginModeButton: { flex: 1, paddingVertical: S(10), alignItems: 'center', backgroundColor: '#2d2d44' },
  loginModeActive: { backgroundColor: '#7c3aed' },
  loginModeText: { color: '#aaa', fontSize: S(14) },
  loginModeTextActive: { color: '#fff' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S(12),
    width: '100%',
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: S(8),
    padding: S(12),
    color: '#fff',
    marginRight: S(8),
  },
  getCodeButton: {
    backgroundColor: '#3b3b5c',
    borderRadius: S(8),
    paddingHorizontal: S(12),
    justifyContent: 'center',
    alignItems: 'center',
    height: S(44),
    flexShrink: 0,
  },
  getCodeText: {
    color: '#7c3aed',
    fontSize: S(13),
    fontWeight: '500',
  },
  sectionTitle: { fontSize: S(18), fontWeight: 'bold', color: '#fff', marginTop: S(20), marginBottom: S(12) },
  humanItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: S(10), borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  humanInfo: { marginLeft: S(12), flex: 1 },
  humanName: { color: '#fff', fontSize: S(16) },
  humanStatus: { color: '#aaa', fontSize: S(12), marginTop: S(2) },
  emptyText: { color: '#666', fontSize: S(14), textAlign: 'center', paddingVertical: S(20) },
  menuOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 999,
    },
  dropdownMenu: {
      position: 'absolute',
      top: S(60),
      right: S(16),
      width: S(280),
      backgroundColor: '#1e1e2e',
      borderRadius: S(16),
      padding: S(16),
      zIndex: 1000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: S(8),
      elevation: 5,
    },
  dropdownUserInfo: { alignItems: 'center', marginBottom: S(16) },
  dropdownUserName: { fontSize: S(16), fontWeight: 'bold', color: '#fff', marginTop: S(8) },
  dropdownUserPhone: { color: '#aaa', fontSize: S(12), marginTop: S(4) },
  dropdownCredits: { backgroundColor: '#7c3aed', borderRadius: S(12), padding: S(12), marginBottom: S(16) },
  dropdownCreditsLabel: { color: '#ddd', fontSize: S(12) },
  dropdownCreditsValue: { color: '#fff', fontSize: S(24), fontWeight: 'bold' },
  dropdownRechargeText: { color: '#fff', fontSize: S(12), marginTop: S(8) },

  dropdownSectionTitle: { fontSize: S(14), fontWeight: 'bold', color: '#aaa', marginBottom: S(8) },
  dropdownHumanItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: S(6) },
  rechargeCard: { width: '90%', maxHeight: '80%', padding: S(20) },
  rechargeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S(20) },
  rechargeTitle: { fontSize: S(20), fontWeight: 'bold', color: '#fff' },
  rechargeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: S(16), borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  rechargeItemLeft: { flex: 1 },
  rechargeItemName: { fontSize: S(16), fontWeight: 'bold', color: '#fff' },
  rechargeItemCredits: { fontSize: S(14), color: '#7c3aed', marginTop: S(4) },
  rechargeItemBonus: { fontSize: S(12), color: '#10b981', marginTop: S(2) },
  rechargeItemRight: { alignItems: 'flex-end' },
  rechargeItemPrice: { fontSize: S(18), fontWeight: 'bold', color: '#7c3aed' },

   paymentCard: {
    width: '80%',
    padding: S(20),
    alignItems: 'center',
  },
  paymentHint: {
    color: '#aaa',
    fontSize: S(14),
    textAlign: 'center',
    marginBottom: S(16),
    lineHeight: S(20),
  },
  paymentQRCodeImage: {
    width: S(280),
    height: S(280),
    borderRadius: S(16),
    backgroundColor: '#fff',
    marginBottom: S(16),
  },
  paymentOrderText: {
    color: '#aaa',
    fontSize: S(12),
    marginBottom: S(12),
  },
  paymentLinkButton: {
    backgroundColor: '#1677ff',
    borderRadius: S(8),
    paddingVertical: S(10),
    paddingHorizontal: S(16),
  },
  paymentLinkButtonText: {
    color: '#fff',
    fontSize: S(14),
    fontWeight: '600',
  },
  closePaymentButton: {
    marginTop: S(20),
    backgroundColor: '#7c3aed',
    borderRadius: S(8),
    paddingVertical: S(10),
    paddingHorizontal: S(20),
  },
  closePaymentText: {
    color: '#fff',
    fontSize: S(16),
  },
  forgotPasswordRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S(12),
  },
  forgotPasswordLink: {
    color: '#7c3aed',
    fontSize: S(14),
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: S(12),
    marginBottom: S(8),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    paddingHorizontal: S(12),
    paddingVertical: S(6),
    borderRadius: S(20),
    gap: 6,
  },
  actionText: {
    color: '#ddd',
    fontSize: S(12),
  },
  resultVideo: {
    width: width * 0.9,
    height: width * 0.9 * 0.5625,
    borderRadius: S(16),
    backgroundColor: '#000',
    marginTop: S(10),
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
    borderRadius: S(16),
  },
  subTabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1e1e2e',
    borderRadius: S(30),
    marginHorizontal: S(20),
    marginVertical: S(10),
    padding: S(4),
  },
  subTab: {
    flex: 1,
    paddingVertical: S(8),
    alignItems: 'center',
    borderRadius: S(25),
  },
  activeSubTab: {
    backgroundColor: '#7c3aed',
  },
  subTabText: {
    color: '#aaa',
    fontSize: S(14),
  },
  activeSubTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  label: {
    color: '#ddd',
    fontSize: S(14),
    marginBottom: S(8),
    marginTop: S(12),
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: S(12),
    padding: S(12),
    color: '#fff',
    fontSize: S(15),      // 从 14 改为 15
    marginBottom: S(16),
  },
  secondaryButton: {
    backgroundColor: '#3b3b5c',
    borderRadius: S(30),
    paddingVertical: S(12),
    alignItems: 'center',
    marginBottom: S(16),
  },
  secondaryButtonText: {
    color: '#7c3aed',
    fontSize: S(16),
    fontWeight: 'bold',
  },
  parseButton: {
    backgroundColor: '#4a90e2',
    padding: S(12),
    borderRadius: S(8),
    alignItems: 'center',
    marginTop: S(8),
    marginBottom: S(16),
  },
  parseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2d2d44',
    marginVertical: S(16),
  },
  hintText: {
    fontSize: S(12),
    color: '#888',
    marginTop: S(4),
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveVideoButton: {
    backgroundColor: '#28a745',
    padding: S(12),
    borderRadius: S(8),
    alignItems: 'center',
    marginTop: S(12),
  },
  saveVideoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  autoImageContainer: {
    marginBottom: S(16),
    alignItems: 'center',
  },
  autoPreviewImage: {
    width: '100%',
    height: S(150),
    borderRadius: S(12),
    marginTop: S(8),
    backgroundColor: '#2d2d44',
  },
  scrollableImageContainer: {
    width: '100%',
    height: S(200),
    backgroundColor: '#2d2d44',
    borderRadius: S(16),
    overflow: 'hidden',
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalClose: {
    position: 'absolute',
    top: S(50),
    right: S(20),
    zIndex: 10,
    padding: S(10),
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  categoryScroll: {
    marginBottom: S(12),
  },
  categoryChip: {
    paddingHorizontal: S(16),
    paddingVertical: S(8),
    borderRadius: S(20),
    backgroundColor: '#2d2d44',
    marginRight: S(10),
  },
  categoryChipActive: {
    backgroundColor: '#7c3aed',
  },
  categoryChipText: {
    color: '#aaa',
    fontSize: S(14),
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  avatarScroll: {
    marginBottom: S(16),
  },
  avatarCard: {
    width: S(100),
    marginRight: S(12),
    alignItems: 'center',
    padding: S(8),
    borderRadius: S(12),
    backgroundColor: '#2d2d44',
  },
  avatarCardActive: {
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  avatarImage: {
    width: S(80),
    height: S(80),
    borderRadius: S(40),
    objectFit: 'cover',
  },
  avatarName: {
    color: '#fff',
    fontSize: S(12),
    marginTop: S(8),
    textAlign: 'center',
  },
  voiceItemWrapper: {
    marginRight: S(12),
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: S(20),
    paddingVertical: S(8),
    paddingHorizontal: S(14),
    gap: 8,
  },
  voiceItemActive: {
    backgroundColor: '#7c3aed',
  },
  voiceItemText: {
    color: '#aaa',
    fontSize: S(14),
  },
  voiceItemTextActive: {
    color: '#fff',
  },
  voicePlayButton: {
    padding: S(6),
    marginLeft: 4,
  },
  loadingVoices: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S(10),
    paddingHorizontal: S(20),
  },
  loadingVoicesText: {
    color: '#aaa',
    marginLeft: S(8),
  },
  customBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: S(10),
    paddingHorizontal: S(6),
    paddingVertical: S(2),
    marginLeft: S(6),
  },
  customBadgeText: {
    color: '#fff',
    fontSize: S(10),
  },
  videoPreviewModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewClose: {
    position: 'absolute',
    top: S(50),
    right: S(20),
    zIndex: 10,
    padding: S(10),
  },
  videoPreviewPlayer: {
    width: '90%',
    height: '60%',
  },
  useThisAvatarButton: {
    marginTop: S(30),
    backgroundColor: '#7c3aed',
    paddingHorizontal: S(30),
    paddingVertical: S(12),
    borderRadius: S(30),
  },
  useThisAvatarButtonText: {
    color: '#fff',
    fontSize: S(16),
    fontWeight: 'bold',
  },
  beianContainer: {
    paddingVertical: S(12),
    paddingBottom: Platform.OS === 'ios' ? S(20) : S(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 0.5,
    borderTopColor: '#2d2d44',
    marginTop: 'auto',
  },
  beianText: {
    fontSize: S(10),
    color: '#666',
    textAlign: 'center',
  },
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
    borderRadius: S(20),
    padding: S(30),
    alignItems: 'center',
    width: '85%',
    maxWidth: S(340),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: S(20),
  },
  generatingTitle: {
    fontSize: S(20),
    fontWeight: 'bold',
    marginTop: S(20),
    color: '#333',
  },
  generatingMsg: {
    fontSize: S(14),
    color: '#FF4757',
    marginTop: S(10),
    fontWeight: '500',
    textAlign: 'center',
  },
  generatingTips: {
    fontSize: S(13),
    color: '#999',
    marginTop: S(6),
  },
  generatingCancelBtn: {
    marginTop: S(20),
    paddingVertical: S(10),
    paddingHorizontal: S(30),
    borderRadius: S(25),
    backgroundColor: '#f0f0f0',
  },
  generatingCancelText: {
    color: '#666',
    fontSize: S(14),
  },
  uploadTips: {
    backgroundColor: '#FFF9E6',
    borderRadius: S(10),
    padding: S(12),
    marginBottom: S(10),
  },
  tipsTitle: {
    color: '#FF8C00',
    fontWeight: 'bold',
    marginBottom: S(5),
  },
  tipsText: {
    color: '#666',
    fontSize: S(13),
    lineHeight: S(20),
  },
  historyItemContainer: {
    alignItems: 'center',
    marginRight: 10,
  },
  historyDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: '#10b981',
  },
  downloadBtnText: {
    color: '#10b981',
    fontSize: 10,
    marginLeft: 2,
  },

  durationSubtext: {
      fontSize: 10,
      color: '#888',
      marginTop: 2,
  },
});

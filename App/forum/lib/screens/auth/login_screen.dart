import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../home/main_layout.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  final TextEditingController _resetEmailController = TextEditingController();
  final TextEditingController _resetTokenController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  
  bool _obscureText = true;
  String _currentView = 'login'; // 'login' | 'forgot' | 'register'
  bool _isLoading = false;
  bool _rememberMe = false;
  String? _errorMessage;
  String? _successMessage;

  void _handleLogin() async {
    setState(() {
      _errorMessage = null;
      _successMessage = null;
      _isLoading = true;
    });

    final result = await AuthService.login(
      _emailController.text.trim(),
      _passwordController.text,
      rememberMe: _rememberMe,
    );
    
    if (mounted) {
      setState(() => _isLoading = false);
      
      if (result['success']) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MainLayout()),
        );
      } else {
        setState(() => _errorMessage = result['message']);
      }
    }
  }

  void _handleRegister() async {
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (username.isEmpty || email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password != confirmPassword) {
      setState(() => _errorMessage = 'Mật khẩu xác nhận không khớp');
      return;
    }

    setState(() {
      _errorMessage = null;
      _successMessage = null;
      _isLoading = true;
    });

    final result = await AuthService.register(username, email, password);

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        setState(() {
          _successMessage = 'Đăng ký thành công! Hãy đăng nhập.';
          _currentView = 'login';
        });
      } else {
        setState(() => _errorMessage = result['message']);
      }
    }
  }

  void _handleForgotPassword() async {
    final email = _resetEmailController.text.trim();
    if (email.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final result = await AuthService.forgotPassword(email);

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        setState(() {
          _successMessage = result['message'];
          _currentView = 'reset';
        });
      } else {
        setState(() => _errorMessage = result['message']);
      }
    }
  }

  void _handleResetPassword() async {
    final token = _resetTokenController.text.trim();
    final newPassword = _newPasswordController.text;

    if (token.isEmpty || newPassword.isEmpty) {
      setState(() => _errorMessage = 'Vui lòng nhập mã và mật khẩu mới');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final result = await AuthService.resetPassword(token, newPassword);

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        setState(() {
          _successMessage = 'Đổi mật khẩu thành công. Hãy đăng nhập.';
          _currentView = 'login';
        });
      } else {
        setState(() => _errorMessage = result['message']);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth > 800;
          return Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFDFDFD), Color(0xFFF5F7FB), Color(0xFFEEF2F7)],
                stops: [0.0, 0.55, 1.0],
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  top: -50, left: -50,
                  child: Container(
                    width: 300, height: 300,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFC91F28).withAlpha((0.08 * 255).round()),
                    ),
                  ),
                ),
                Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 1000, minHeight: 600),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha((0.95 * 255).round()),
                        borderRadius: BorderRadius.circular(38),
                        border: Border.all(color: Colors.white, width: 1.5),
                        boxShadow: [
                          BoxShadow(color: const Color(0xFF0F172A).withAlpha((0.08 * 255).round()), blurRadius: 40, offset: const Offset(0, 15)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (isDesktop)
                              Expanded(
                                flex: 115,
                                child: _buildBannerContent(),
                              ),
                            Expanded(
                              flex: 100,
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: isDesktop ? 48.0 : 24.0, vertical: 48.0),
                                child: Center(
                                  child: ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 400),
                                    child: _currentView == 'login' 
                                      ? _buildLoginForm(isDesktop) 
                                      : (_currentView == 'register' 
                                          ? _buildRegisterForm(isDesktop) 
                                          : (_currentView == 'reset' 
                                              ? _buildResetForm(isDesktop) 
                                              : _buildForgotForm(isDesktop))),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBannerContent() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFAB111F), Color(0xFFC91F28), Color(0xFF7C102D)],
          stops: [0.0, 0.46, 1.0],
        ),
      ),
      padding: const EdgeInsets.all(48.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 32),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha((0.15 * 255).round()),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                    SizedBox(width: 8),
                    Text('LINKY WORKSPACE', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  ],
                ),
              ),
              Text(
                _currentView == 'login' 
                  ? 'Chào mừng\nquay trở lại' 
                  : (_currentView == 'register' ? 'Tạo tài khoản\nmới của bạn' : 'Khôi phục\ntài khoản an toàn'),
                style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w900, height: 1.2),
              ),
              const SizedBox(height: 16),
              Text(
                _currentView == 'login' 
                  ? 'Đăng nhập để tiếp tục công việc, theo dõi thông báo và quản lý nội dung của bạn.' 
                  : (_currentView == 'register' ? 'Tham gia ngay hôm nay để trải nghiệm hệ thống.' : 'Nhập tài khoản hoặc email để nhận hướng dẫn khôi phục mật khẩu ngay lập tức.'),
                style: TextStyle(color: Colors.white.withAlpha((0.85 * 255).round()), fontSize: 15, height: 1.6),
              ),
            ],
          ),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha((0.1 * 255).round()),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withAlpha((0.25 * 255).round())),
                ),
                child: Row(
                  children: [
                    Icon(Icons.shield_outlined, color: Colors.white.withAlpha((0.9 * 255).round()), size: 24),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('BẢO MẬT', style: TextStyle(color: Colors.white.withAlpha((0.75 * 255).round()), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                          const SizedBox(height: 4),
                          const Text('Xác thực tài khoản theo phiên', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha((0.1 * 255).round()),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withAlpha((0.25 * 255).round())),
                ),
                child: Row(
                  children: [
                    Icon(Icons.vpn_key_outlined, color: Colors.white.withAlpha((0.9 * 255).round()), size: 24),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('TRUY CẬP NHANH', style: TextStyle(color: Colors.white.withAlpha((0.75 * 255).round()), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                          const SizedBox(height: 4),
                          const Text('Đơn giản, rõ ràng, dễ sử dụng', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  InputDecoration _getInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 15),
      filled: true,
      fillColor: Colors.white.withAlpha((0.8 * 255).round()),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFC91F28), width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _buildLoginForm(bool isDesktop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isDesktop) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: const Text('LINKY', style: TextStyle(color: Color(0xFFC91F28), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          ),
        ],
        Text('Secure login', style: TextStyle(color: const Color(0xFFC91F28).withAlpha((0.8 * 255).round()), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5, textBaseline: TextBaseline.alphabetic)),
        const SizedBox(height: 8),
        const Text('Đăng nhập', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF18181B), letterSpacing: -0.5)),
        const SizedBox(height: 8),
        const Text('Nhập thông tin tài khoản đã được cấp để tiếp tục.', style: TextStyle(fontSize: 14, color: Color(0xFF71717A))),
        const SizedBox(height: 32),

        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(fontSize: 14, color: Colors.red)),
          ),

        if (_successMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: Colors.green.shade50, 
              border: Border.all(color: Colors.green.shade200), 
              borderRadius: BorderRadius.circular(12)
            ),
            child: Text(_successMessage!, style: const TextStyle(fontSize: 14, color: Colors.green)),
          ),

        const Text('Email / Tài khoản', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(
          controller: _emailController,
          decoration: _getInputDecoration('Nhập email hoặc tên đăng nhập'),
        ),
        const SizedBox(height: 20),
        
        const Text('Mật khẩu', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: _obscureText,
          decoration: _getInputDecoration('Nhập mật khẩu').copyWith(
            suffixIcon: IconButton(
              icon: Icon(_obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey.shade400, size: 20),
              onPressed: () => setState(() => _obscureText = !_obscureText),
            ),
          ),
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: _rememberMe,
                activeColor: const Color(0xFFC91F28),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                onChanged: (v) => setState(() => _rememberMe = v ?? false),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: () => setState(() => _rememberMe = !_rememberMe),
              child: const Text('Duy trì đăng nhập', style: TextStyle(fontSize: 14, color: Color(0xFF3F3F46))),
            ),
            const Spacer(),
            TextButton(
              onPressed: () => setState(() => _currentView = 'forgot'),
              child: const Text('Quên mật khẩu?', style: TextStyle(color: Color(0xFF71717A), fontWeight: FontWeight.w500)),
            ),
          ],
        ),

        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC91F28),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
              shadowColor: const Color(0xFFC91F28).withAlpha((0.4 * 255).round()),
            ),
            child: _isLoading 
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Đăng nhập', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
          ),
        ),
        const SizedBox(height: 16),

      ],
    );
  }

  Widget _buildRegisterForm(bool isDesktop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isDesktop) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: const Text('LINKY', style: TextStyle(color: Color(0xFFC91F28), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          ),
        ],
        TextButton.icon(
          style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft, foregroundColor: const Color(0xFF71717A)),
          onPressed: () => setState(() => _currentView = 'login'),
          icon: const Icon(Icons.arrow_back, size: 16, color: Color(0xFF71717A)),
          label: const Text('Quay lại đăng nhập'),
        ),
        const SizedBox(height: 16),
        Text('Secure register', style: TextStyle(color: const Color(0xFFC91F28).withAlpha((0.8 * 255).round()), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5, textBaseline: TextBaseline.alphabetic)),
        const SizedBox(height: 8),
        const Text('Đăng ký', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF18181B), letterSpacing: -0.5)),
        const SizedBox(height: 8),
        const Text('Tham gia ngay hôm nay để trải nghiệm hệ thống.', style: TextStyle(fontSize: 14, color: Color(0xFF71717A))),
        const SizedBox(height: 32),

        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(fontSize: 14, color: Colors.red)),
          ),

        const Text('Tên đăng nhập', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(controller: _usernameController, decoration: _getInputDecoration('Nhập tên đăng nhập')),
        const SizedBox(height: 16),

        const Text('Email', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(controller: _emailController, decoration: _getInputDecoration('Nhập email của bạn')),
        const SizedBox(height: 16),
        
        const Text('Mật khẩu', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: _obscureText,
          decoration: _getInputDecoration('Mật khẩu').copyWith(
            suffixIcon: IconButton(
              icon: Icon(_obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey.shade400, size: 20),
              onPressed: () => setState(() => _obscureText = !_obscureText),
            ),
          ),
        ),
        const SizedBox(height: 16),

        const Text('Xác nhận mật khẩu', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureText,
          decoration: _getInputDecoration('Xác nhận mật khẩu'),
        ),
        const SizedBox(height: 32),
        
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleRegister,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC91F28),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
              shadowColor: const Color(0xFFC91F28).withAlpha((0.4 * 255).round()),
            ),
            child: _isLoading 
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Đăng ký ngay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.person_add_alt_1_outlined, size: 18),
                  ],
                ),
          ),
        ),
      ],
    );
  }

  Widget _buildForgotForm(bool isDesktop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isDesktop) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: const Text('LINKY', style: TextStyle(color: Color(0xFFC91F28), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          ),
        ],
        TextButton.icon(
          style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft, foregroundColor: const Color(0xFF71717A)),
          onPressed: () => setState(() => _currentView = 'login'),
          icon: const Icon(Icons.arrow_back, size: 16, color: Color(0xFF71717A)),
          label: const Text('Quay lại đăng nhập'),
        ),
        const SizedBox(height: 16),
        Text('Password support', style: TextStyle(color: const Color(0xFFC91F28).withAlpha((0.8 * 255).round()), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5, textBaseline: TextBaseline.alphabetic)),
        const SizedBox(height: 8),
        const Text('Khôi phục mật khẩu', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF18181B), letterSpacing: -0.5)),
        const SizedBox(height: 8),
        const Text('Nhập tài khoản hoặc email, hệ thống sẽ gửi hướng dẫn về hộp thư của bạn.', style: TextStyle(fontSize: 14, color: Color(0xFF71717A))),
        const SizedBox(height: 32),

        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(fontSize: 14, color: Colors.red)),
          ),

        if (_successMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: Colors.green.shade50, 
              border: Border.all(color: Colors.green.shade200), 
              borderRadius: BorderRadius.circular(12)
            ),
            child: Text(_successMessage!, style: const TextStyle(fontSize: 14, color: Colors.green)),
          ),
        
        const Text('Tài khoản hoặc Email', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(controller: _resetEmailController, decoration: _getInputDecoration('Nhập tài khoản hoặc email')),
        const SizedBox(height: 32),
        
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleForgotPassword,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC91F28),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
              shadowColor: const Color(0xFFC91F28).withAlpha((0.4 * 255).round()),
            ),
            child: _isLoading 
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Gửi hướng dẫn', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(
            onPressed: () => setState(() => _currentView = 'reset'),
            child: const Text('Đã có mã xác thực? Nhập mã ngay', style: TextStyle(color: Color(0xFF71717A))),
          ),
        ),
      ],
    );
  }

  Widget _buildResetForm(bool isDesktop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!isDesktop) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: const Text('LINKY', style: TextStyle(color: Color(0xFFC91F28), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          ),
        ],
        TextButton.icon(
          style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft, foregroundColor: const Color(0xFF71717A)),
          onPressed: () => setState(() => _currentView = 'forgot'),
          icon: const Icon(Icons.arrow_back, size: 16, color: Color(0xFF71717A)),
          label: const Text('Quay lại'),
        ),
        const SizedBox(height: 16),
        Text('Secure reset', style: TextStyle(color: const Color(0xFFC91F28).withAlpha((0.8 * 255).round()), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5, textBaseline: TextBaseline.alphabetic)),
        const SizedBox(height: 8),
        const Text('Đặt lại mật khẩu', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF18181B), letterSpacing: -0.5)),
        const SizedBox(height: 8),
        const Text('Nhập mã xác thực (Token) gửi về email của bạn cùng mật khẩu mới.', style: TextStyle(fontSize: 14, color: Color(0xFF71717A))),
        const SizedBox(height: 32),

        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(fontSize: 14, color: Colors.red)),
          ),

        if (_successMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: Colors.green.shade50, 
              border: Border.all(color: Colors.green.shade200), 
              borderRadius: BorderRadius.circular(12)
            ),
            child: Text(_successMessage!, style: const TextStyle(fontSize: 14, color: Colors.green)),
          ),
        
        const Text('Mã xác thực (Token)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(controller: _resetTokenController, decoration: _getInputDecoration('Nhập mã được gửi vào email')),
        const SizedBox(height: 20),
        
        const Text('Mật khẩu mới', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF3F3F46))),
        const SizedBox(height: 8),
        TextField(
          controller: _newPasswordController,
          obscureText: _obscureText,
          decoration: _getInputDecoration('Nhập mật khẩu mới').copyWith(
            suffixIcon: IconButton(
              icon: Icon(_obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey.shade400, size: 20),
              onPressed: () => setState(() => _obscureText = !_obscureText),
            ),
          ),
        ),
        const SizedBox(height: 32),
        
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleResetPassword,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC91F28),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 4,
              shadowColor: const Color(0xFFC91F28).withAlpha((0.4 * 255).round()),
            ),
            child: _isLoading 
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Đặt lại mật khẩu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.check, size: 18),
                  ],
                ),
          ),
        ),
      ],
    );
  }
}

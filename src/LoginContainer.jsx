import React, {useRef, useState} from "react";




function LoginContainer() {

    const [authLoading, setAuthLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [sessionToken, setSessionToken] = useState(sessionStorage.getItem('session_token') || null)

    const checkEmailAndSendOtp = async () => {
        if (!email.trim()) return
        setAuthLoading(true)
        try {
            const res = await fetch('https://russie.app.n8n.cloud/webhook/russie-verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }).toLowerCase()
            })
            const data = await res.json()
            if (data.success) {
                setOtpSent(true) // move to OTP input
            } else {
                alert(data.message || 'Email not registered')
            }
        } catch (err) {
            alert('Error sending OTP')
        } finally {
            setAuthLoading(false)
        }
    }

// Verify OTP
    const verifyOtp = async () => {
        if (!otp.trim()) return
        setAuthLoading(true)
        try {
            const res = await fetch('https://russie.app.n8n.cloud/webhook/russie-verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            })
            const data = await res.json()
            if (data.success) {
                setSessionToken(data.token)
                setChatEndpoint(data.chat_endpoint)

                sessionStorage.setItem('session_token', data.token)
                sessionStorage.setItem('session_email', data.email.toLowerCase())
                sessionStorage.setItem('session_chat_endpoint', data.chat_endpoint)
            } else {
                alert(data.message || 'Invalid OTP')
            }
        } catch (err) {
            alert('Error verifying OTP')
        } finally {
            setAuthLoading(false)
        }
    }

    return (
        <div className={'login-screen'}>
            <div className="login-container">
                <h2>Seeker Login</h2>
                {!otpSent ? (
                    <>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && checkEmailAndSendOtp()}
                            placeholder="Enter your email"
                            disabled={authLoading}
                        />

                        <button
                            onClick={checkEmailAndSendOtp}
                            disabled={authLoading || !email.trim()}
                        >
                            {authLoading ? 'Checking...' : 'Next'}
                        </button>
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                            placeholder="Enter OTP"
                            disabled={authLoading}
                        />
                        <button
                            onClick={verifyOtp}
                            disabled={authLoading || !otp.trim()}
                        >
                            {authLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button onClick={() => setOtpSent(false)}>Change Email</button>
                    </>
                )}
            </div>
        </div>
    )
} export default LoginContainer
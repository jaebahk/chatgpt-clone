import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { generateToken } from '../services/auth';
import { User } from '../types';

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

router.get('/google', (req, res) => {
  console.log('Google auth initiated');
  const scopes = ['openid', 'email', 'profile'];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  
  console.log('Redirecting to Google:', url);
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  console.log('Google callback received');
  console.log('Query params:', req.query);
  const { code } = req.query;
  
  if (!code) {
    console.log('No authorization code received');
    return res.status(400).json({ error: 'Authorization code required' });
  }
  
  try {
    console.log('Getting tokens from Google...');
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    console.log('Tokens received successfully');
    
    console.log('Verifying ID token...');
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      console.log('Failed to get payload from ticket');
      return res.status(400).json({ error: 'Failed to get user info' });
    }
    
    console.log('User payload:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name
    });
    
    const user: User = {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Generating JWT token...');
    const token = generateToken(user);
    console.log('JWT token generated successfully');
    
    const userParam = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    }));
    
    const redirectUrl = `http://localhost:5173/auth/callback?token=${token}&user=${userParam}`;
    console.log('Redirecting to client:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('http://localhost:5173/?error=auth_failed');
  }
});

export default router;
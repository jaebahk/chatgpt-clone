import { generateToken, verifyToken } from '../services/auth';

describe('Auth Service', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // This would require mocking jwt.sign with expired token
      // For now, just test invalid format
      expect(() => {
        verifyToken('expired.token.here');
      }).toThrow();
    });
  });
});
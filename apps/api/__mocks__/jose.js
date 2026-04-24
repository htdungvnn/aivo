// Mock for jose (JWT library)
const sign = jest.fn().mockResolvedValue('signed.jwt.token');
const jwtVerify = jest.fn().mockResolvedValue({
  payload: { sub: 'user-123', email: 'test@example.com' },
  protectedHeader: {},
});

module.exports = {
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('signed.jwt.token'),
  })),
  jwtVerify,
  sign,
  compactEncrypt: jest.fn(),
  compactDecrypt: jest.fn(),
  createDecrypt: jest.fn(),
  createEncrypt: jest.fn(),
  createSign: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockResolvedValue('signed.jwt.token'),
  })),
  createVerify: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue({ payload: {}, protectedHeader: {} }),
  })),
  decodeJwt: jest.fn(),
  isJWT: jest.fn(),
  JWT: {},
  JWK: {},
};

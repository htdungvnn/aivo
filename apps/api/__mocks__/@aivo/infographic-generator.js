// Mock for @aivo/infographic-generator WASM package
const InfographicGenerator = {
  new: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockReturnValue({ url: 'test.png' }),
    render: jest.fn().mockReturnValue({ buffer: Buffer.from('') }),
  })),
};

module.exports = {
  InfographicGenerator,
};

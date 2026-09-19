import { fetchPaths } from '../src/services/api';

describe('Pathfinder API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  it('fetches learning paths successfully', async () => {
    const mockResponse = {
      paths: [{ id: '1', title: 'Software Engineering', total_steps: 5 }],
      total: 1,
      has_more: false,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const data = await fetchPaths();
    expect(data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/paths/'),
      undefined,
    );
  });
});

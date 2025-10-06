const ETHOS_API_BASE = "https://api.ethos.network/api/v2";

export interface EthosUser {
  id: number;
  profileId: number | null;
  displayName: string;
  username: string | null;
  avatarUrl: string;
  description: string | null;
  score: number;
  status: "ACTIVE" | "INACTIVE" | "MERGED";
  userkeys: string[];
  xpTotal: number;
  xpStreakDays: number;
  links: {
    profile: string;
    scoreBreakdown: string;
  };
  stats: {
    review: {
      received: {
        negative: number;
        neutral: number;
        positive: number;
      };
    };
    vouch: {
      given: {
        amountWeiTotal: number;
        count: number;
      };
      received: {
        amountWeiTotal: number;
        count: number;
      };
    };
  };
}

export interface SearchResponse {
  values: EthosUser[];
  total: number;
  limit: number;
  offset: number;
}

export async function searchUsersByTwitter(query: string): Promise<EthosUser[]> {
  const response = await fetch(`${ETHOS_API_BASE}/users/search?query=${encodeURIComponent(query)}&limit=10`, {
    headers: {
      'X-Ethos-Client': 'signals-app@1.0.0'
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data: SearchResponse = await response.json();
  return data.values;
}

export async function getUserByTwitterUsername(username: string): Promise<EthosUser | null> {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/user/by/x/${encodeURIComponent(username)}`, {
      headers: {
        'X-Ethos-Client': 'signals-app@1.0.0'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user by Twitter username:', error);
    return null;
  }
}

export async function getUserByAddress(address: string): Promise<EthosUser | null> {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/user/by/address/${encodeURIComponent(address)}`, {
      headers: {
        'X-Ethos-Client': 'signals-app@1.0.0'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user by address:', error);
    return null;
  }
}

export async function getUserByProfileId(profileId: number): Promise<EthosUser | null> {
  try {
    // Use the internal userkey endpoint with profileId format
    const userkey = `profileId:${profileId}`;
    const response = await fetch(`${ETHOS_API_BASE}/internal/users/${encodeURIComponent(userkey)}`, {
      headers: {
        'X-Ethos-Client': 'signals-app@1.0.0'
      }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.user || null;
  } catch (error) {
    console.error('Error fetching user by profile ID:', error);
    return null;
  }
}

export async function getUserScore(userkey: string): Promise<{ score?: number; level: string }> {
  try {
    const response = await fetch(`${ETHOS_API_BASE}/score/userkey?userkey=${encodeURIComponent(userkey)}`, {
      headers: {
        'X-Ethos-Client': 'signals-app@1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user score:', error);
    return { level: 'unknown' };
  }
}




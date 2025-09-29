INSERT INTO verified_projects (
    id, 
    ethos_user_id, 
    twitter_username, 
    display_name, 
    avatar_url, 
    type, 
    chain, 
    link, 
    coingecko_id, 
    created_at
) VALUES (
    '01JH1ZQMR8XHBQVPW5K7N8DQ2F', -- ULID
    999999, -- Dummy Ethos user ID
    'plasmafdn',
    'Plasma',
    'https://pbs.twimg.com/profile_images/placeholder.jpg',
    'token',
    'ethereum',
    NULL, -- No contract address for Layer 1
    'plasma', -- CoinGecko ID
    NOW()
) ON CONFLICT (ethos_user_id) DO UPDATE SET
    twitter_username = EXCLUDED.twitter_username,
    display_name = EXCLUDED.display_name,
    coingecko_id = EXCLUDED.coingecko_id;



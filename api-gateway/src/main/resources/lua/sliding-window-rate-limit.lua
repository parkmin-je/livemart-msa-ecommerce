--[[
  Redis Sliding Window Rate Limiting Lua Script

  알고리즘: Sliding Window (슬라이딩 윈도우)
  구현: Redis Sorted Set (ZRANGEBYSCORE, ZADD, ZREMRANGEBYSCORE)

  Token Bucket 대비 장점:
  - 윈도우 경계에서의 트래픽 버스트 방지
  - 더 균등한 요청 분산
  - 정확한 요청 수 계산

  KEYS[1]: Rate Limit 키 (예: "rl:user:123:/api/orders:POST")
  ARGV[1]: 현재 타임스탬프 (밀리초)
  ARGV[2]: 윈도우 크기 (밀리초), 예: 60000 (1분)
  ARGV[3]: 최대 허용 요청 수
  ARGV[4]: TTL (초) — 윈도우 크기 + 여유분

  반환값:
    {allowed, current_count, remaining}
    allowed: 1=허용, 0=거부
    current_count: 현재 윈도우 내 요청 수
    remaining: 남은 허용 요청 수
]]

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local ttl_seconds = tonumber(ARGV[4])

-- 윈도우 시작 시간 (현재 - 윈도우 크기)
local window_start = now - window_ms

-- 1. 만료된 요청 제거 (윈도우 밖의 오래된 요청)
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- 2. 현재 윈도우 내 요청 수 계산
local current_count = redis.call('ZCARD', key)

-- 3. 허용 여부 판단
local allowed = 0
local remaining = max_requests - current_count

if current_count < max_requests then
    -- 4. 허용 시: 현재 요청을 Sorted Set에 추가
    --    score=타임스탬프(ms), member=타임스탬프+랜덤(유니크 보장)
    local member = now .. ':' .. math.random(1000000)
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, ttl_seconds)

    allowed = 1
    remaining = max_requests - current_count - 1
else
    allowed = 0
    remaining = 0
end

return {allowed, current_count, remaining}

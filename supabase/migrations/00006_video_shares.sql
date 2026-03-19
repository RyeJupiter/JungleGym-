-- ============================================================
-- JungleGym – Video share tokens (one share per purchase)
-- ============================================================

-- Allow $0 purchases for share redemptions
ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_amount_paid_check;
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_amount_paid_check CHECK (amount_paid >= 0);

CREATE TABLE public.video_shares (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  owner_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  redeemed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_share_per_purchase UNIQUE (owner_user_id, video_id)
);

ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_shares: owner read"
  ON public.video_shares FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "video_shares: owner insert"
  ON public.video_shares FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Atomic RPC: validates token, inserts $0 purchase, marks redeemed
CREATE OR REPLACE FUNCTION public.redeem_video_share(
  p_token    TEXT,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share video_shares%ROWTYPE;
BEGIN
  SELECT * INTO v_share
  FROM video_shares
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_share.redeemed_by IS NOT NULL AND v_share.redeemed_by != p_user_id THEN
    RETURN jsonb_build_object('error', 'already_redeemed');
  END IF;

  -- Idempotent insert (skip if already purchased)
  INSERT INTO purchases (user_id, video_id, tier, amount_paid, platform_tip_pct, platform_amount, total_amount)
  VALUES (p_user_id, v_share.video_id, 'supported', 0, 0, 0, 0)
  ON CONFLICT DO NOTHING;

  -- Mark redeemed (idempotent)
  UPDATE video_shares
  SET redeemed_by = p_user_id, redeemed_at = NOW()
  WHERE id = v_share.id AND redeemed_by IS NULL;

  RETURN jsonb_build_object(
    'video_id', v_share.video_id,
    'owner_user_id', v_share.owner_user_id
  );
END;
$$;

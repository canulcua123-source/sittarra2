#!/bin/bash

# ============================================
# MESA FELIZ - API TESTING SCRIPT
# Verificación completa de endpoints
# ============================================

API_URL="http://localhost:3002/api"
TOKEN=""
TEST_USER_EMAIL="test-$(date +%s)@example.com"
TEST_USER_PASSWORD="Test123!"
RESTAURANT_ID=""
RESERVATION_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "MESA FELIZ - API TESTING"
echo "============================================"
echo ""

# ============================================
# 1. AUTHENTICATION TESTS
# ============================================
echo -e "${YELLOW}[1/10] Testing Authentication...${NC}"

# Register customer
echo "  → POST /auth/customer/register"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/customer/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"name\":\"Test User\",\"phone\":\"1234567890\",\"password\":\"$TEST_USER_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo -e "    ${GREEN}✓ Customer registration${NC}"
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo -e "    ${RED}✗ Customer registration${NC}"
  echo "    Response: $REGISTER_RESPONSE"
fi

# Login
echo "  → POST /auth/customer/login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/customer/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
  echo -e "    ${GREEN}✓ Customer login${NC}"
else
  echo -e "    ${RED}✗ Customer login${NC}"
fi

echo ""

# ============================================
# 2. RESTAURANTS TESTS
# ============================================
echo -e "${YELLOW}[2/10] Testing Restaurants...${NC}"

# List restaurants
echo "  → GET /restaurants"
RESTAURANTS_RESPONSE=$(curl -s "$API_URL/restaurants")

if echo "$RESTAURANTS_RESPONSE" | grep -q "success.*true"; then
  echo -e "    ${GREEN}✓ List restaurants${NC}"
  RESTAURANT_ID=$(echo "$RESTAURANTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
else
  echo -e "    ${RED}✗ List restaurants${NC}"
fi

# Get restaurant details
if [ ! -z "$RESTAURANT_ID" ]; then
  echo "  → GET /restaurants/:id"
  RESTAURANT_DETAIL=$(curl -s "$API_URL/restaurants/$RESTAURANT_ID")
  
  if echo "$RESTAURANT_DETAIL" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Get restaurant details${NC}"
  else
    echo -e "    ${RED}✗ Get restaurant details${NC}"
  fi
fi

echo ""

# ============================================
# 3. FAVORITES TESTS (NEW)
# ============================================
echo -e "${YELLOW}[3/10] Testing Favorites (NEW)...${NC}"

if [ ! -z "$TOKEN" ] && [ ! -z "$RESTAURANT_ID" ]; then
  # Add favorite
  echo "  → POST /favorites"
  FAV_ADD=$(curl -s -X POST "$API_URL/favorites" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"restaurantId\":\"$RESTAURANT_ID\"}")
  
  if echo "$FAV_ADD" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Add favorite${NC}"
  else
    echo -e "    ${RED}✗ Add favorite${NC}"
  fi

  # List favorites
  echo "  → GET /favorites/my"
  FAV_LIST=$(curl -s "$API_URL/favorites/my" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$FAV_LIST" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ List favorites${NC}"
  else
    echo -e "    ${RED}✗ List favorites${NC}"
  fi

  # Check favorite
  echo "  → GET /favorites/check/:id"
  FAV_CHECK=$(curl -s "$API_URL/favorites/check/$RESTAURANT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$FAV_CHECK" | grep -q "isFavorite.*true"; then
    echo -e "    ${GREEN}✓ Check favorite${NC}"
  else
    echo -e "    ${RED}✗ Check favorite${NC}"
  fi

  # Remove favorite
  echo "  → DELETE /favorites/:id"
  FAV_REMOVE=$(curl -s -X DELETE "$API_URL/favorites/$RESTAURANT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$FAV_REMOVE" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Remove favorite${NC}"
  else
    echo -e "    ${RED}✗ Remove favorite${NC}"
  fi
else
  echo -e "    ${RED}✗ Skipped (no token or restaurant)${NC}"
fi

echo ""

# ============================================
# 4. NOTIFICATIONS TESTS (NEW)
# ============================================
echo -e "${YELLOW}[4/10] Testing Notifications (NEW)...${NC}"

if [ ! -z "$TOKEN" ]; then
  # Create notification
  echo "  → POST /notifications"
  NOTIF_CREATE=$(curl -s -X POST "$API_URL/notifications" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"type\":\"test\",\"title\":\"Test\",\"message\":\"Testing\"}")
  
  if echo "$NOTIF_CREATE" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Create notification${NC}"
  else
    echo -e "    ${RED}✗ Create notification${NC}"
  fi

  # List notifications
  echo "  → GET /notifications"
  NOTIF_LIST=$(curl -s "$API_URL/notifications" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$NOTIF_LIST" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ List notifications${NC}"
  else
    echo -e "    ${RED}✗ List notifications${NC}"
  fi

  # Get unread notifications
  echo "  → GET /notifications/unread"
  NOTIF_UNREAD=$(curl -s "$API_URL/notifications/unread" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$NOTIF_UNREAD" | grep -q "unreadCount"; then
    echo -e "    ${GREEN}✓ Get unread notifications${NC}"
  else
    echo -e "    ${RED}✗ Get unread notifications${NC}"
  fi

  # Mark all as read
  echo "  → PATCH /notifications/read-all"
  NOTIF_READ_ALL=$(curl -s -X PATCH "$API_URL/notifications/read-all" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$NOTIF_READ_ALL" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Mark all as read${NC}"
  else
    echo -e "    ${RED}✗ Mark all as read${NC}"
  fi
else
  echo -e "    ${RED}✗ Skipped (no token)${NC}"
fi

echo ""

# ============================================
# 5. MENU CATEGORIES TESTS (NEW)
# ============================================
echo -e "${YELLOW}[5/10] Testing Menu Categories (NEW)...${NC}"

if [ ! -z "$RESTAURANT_ID" ]; then
  # List categories (public)
  echo "  → GET /menu-categories/:restaurantId"
  CAT_LIST=$(curl -s "$API_URL/menu-categories/$RESTAURANT_ID")
  
  if echo "$CAT_LIST" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ List menu categories${NC}"
  else
    echo -e "    ${RED}✗ List menu categories${NC}"
  fi
else
  echo -e "    ${RED}✗ Skipped (no restaurant)${NC}"
fi

echo ""

# ============================================
# 6. WAITLIST TESTS (NEW)
# ============================================
echo -e "${YELLOW}[6/10] Testing Waitlist Public (NEW)...${NC}"

if [ ! -z "$RESTAURANT_ID" ]; then
  # Join waitlist
  echo "  → POST /waitlist/join"
  WAIT_JOIN=$(curl -s -X POST "$API_URL/waitlist/join" \
    -H "Content-Type: application/json" \
    -d "{\"restaurantId\":\"$RESTAURANT_ID\",\"name\":\"Test\",\"phone\":\"111111\",\"partySize\":2}")
  
  if echo "$WAIT_JOIN" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ Join waitlist${NC}"
    WAITLIST_ID=$(echo "$WAIT_JOIN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  else
    echo -e "    ${RED}✗ Join waitlist${NC}"
  fi

  # Get status
  if [ ! -z "$WAITLIST_ID" ]; then
    echo "  → GET /waitlist/:id/status"
    WAIT_STATUS=$(curl -s "$API_URL/waitlist/$WAITLIST_ID/status")
    
    if echo "$WAIT_STATUS" | grep -q "currentPosition"; then
      echo -e "    ${GREEN}✓ Get waitlist status${NC}"
    else
      echo -e "    ${RED}✗ Get waitlist status${NC}"
    fi
  fi
else
  echo -e "    ${RED}✗ Skipped (no restaurant)${NC}"
fi

echo ""

# ============================================
# 7. REVIEWS TESTS
# ============================================
echo -e "${YELLOW}[7/10] Testing Reviews (Enhanced)...${NC}"

if [ ! -z "$RESTAURANT_ID" ]; then
  # List reviews
  echo "  → GET /reviews?restaurantId=..."
  REVIEWS_LIST=$(curl -s "$API_URL/reviews?restaurantId=$RESTAURANT_ID")
  
  if echo "$REVIEWS_LIST" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ List reviews${NC}"
  else
    echo -e "    ${RED}✗ List reviews${NC}"
  fi

  # Get stats
  echo "  → GET /reviews/stats/:id"
  REVIEWS_STATS=$(curl -s "$API_URL/reviews/stats/$RESTAURANT_ID")
  
  if echo "$REVIEWS_STATS" | grep -q "averageRating"; then
    echo -e "    ${GREEN}✓ Get review stats${NC}"
  else
    echo -e "    ${RED}✗ Get review stats${NC}"
  fi
fi

echo ""

# ============================================
# 8. RESERVATIONS TESTS
# ============================================
echo -e "${YELLOW}[8/10] Testing Reservations...${NC}"

if [ ! -z "$TOKEN" ]; then
  # List my reservations
  echo "  → GET /reservations/my"
  MY_RESERVATIONS=$(curl -s "$API_URL/reservations/my" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$MY_RESERVATIONS" | grep -q "success.*true"; then
    echo -e "    ${GREEN}✓ List my reservations${NC}"
  else
    echo -e "    ${RED}✗ List my reservations${NC}"
  fi
else
  echo -e "    ${RED}✗ Skipped (no token)${NC}"
fi

echo ""

# ============================================
# 9. OFFERS TESTS
# ============================================
echo -e "${YELLOW}[9/10] Testing Offers...${NC}"

# List offers
echo "  → GET /offers"
OFFERS_LIST=$(curl -s "$API_URL/offers")

if echo "$OFFERS_LIST" | grep -q "success.*true"; then
  echo -e "    ${GREEN}✓ List offers${NC}"
else
  echo -e "    ${RED}✗ List offers${NC}"
fi

echo ""

# ============================================
# 10. HEALTH CHECK
# ============================================
echo -e "${YELLOW}[10/10] Testing Health Check...${NC}"

echo "  → GET /health"
HEALTH=$(curl -s "http://localhost:3002/health")

if echo "$HEALTH" | grep -q "success.*true"; then
  echo -e "    ${GREEN}✓ Health check${NC}"
else
  echo -e "    ${RED}✗ Health check${NC}"
fi

echo ""
echo "============================================"
echo "TESTING COMPLETED"
echo "============================================"

"""
JetX React API - Modern REST endpoints for React frontend
Handles single-player game sessions with backend-validated crash times
"""

import hashlib
import secrets
import random
from datetime import datetime
from decimal import Decimal

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import desc

from app.extensions import db
from app.models.wallet import Wallet, Transaction
from app.models.jetx_models import JetXGame, JetXBet, JetXStats

# Create blueprint
jetx_react_bp = Blueprint('jetx_react', __name__, url_prefix='/api/jetx')

class JetXReactEngine:
    MIN_BET = Decimal("10")
    MAX_BET = Decimal("100000")
    MIN_MULTIPLIER = Decimal("1.01")
    MAX_MULTIPLIER = Decimal("20.00")
    CRASH_TIME_MIN = 5000  # milliseconds
    CRASH_TIME_MAX = 25000  # milliseconds

@jetx_react_bp.route('/start', methods=['POST'])
@login_required
def start_game():
    """Start a new game - generate crash time server-side"""
    try:
        data = request.json
        bet_amount = Decimal(str(data.get('bet', 0)))
        
        # Validate bet
        if bet_amount < JetXReactEngine.MIN_BET or bet_amount > JetXReactEngine.MAX_BET:
            return jsonify({'error': 'Invalid bet amount'}), 400
        
        # Check balance
        wallet = Wallet.query.filter_by(user_id=current_user.id).first()
        if not wallet or wallet.balance < bet_amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Deduct bet from balance immediately
        wallet.balance -= bet_amount
        
        # Generate crash time (5-25 seconds)
        crash_time_ms = random.randint(
            JetXReactEngine.CRASH_TIME_MIN,
            JetXReactEngine.CRASH_TIME_MAX
        )
        
        # Generate server seed for provably fair
        server_seed = secrets.token_hex(16)
        
        # Create game record
        game = JetXGame(
            round_number=int(datetime.utcnow().timestamp()),
            crash_point=Decimal(str(crash_time_ms / 1000)),
            status='active',
            seed=server_seed
        )
        
        db.session.add(game)
        db.session.commit()
        
        # Create bet record
        bet = JetXBet(
            user_id=current_user.id,
            game_id=game.id,
            bet_amount=bet_amount,
            status='active'
        )
        
        # Log transaction
        tx = Transaction(
            user_id=current_user.id,
            type='stake',
            amount=-bet_amount,
            reference_type='jetx_react_game',
            reference_id=game.id,
            description=f'JetX bet ${bet_amount}'
        )
        
        db.session.add(bet)
        db.session.add(tx)
        db.session.commit()
        
        return jsonify({
            'game_id': str(game.id),
            'crash_time': crash_time_ms,  # Tell React when it will crash
            'bet': float(bet_amount)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jetx_react_bp.route('/cashout', methods=['POST'])
@login_required
def cashout():
    """Player cashes out - calculate and validate winnings"""
    try:
        data = request.json
        game_id = data.get('game_id')
        multiplier = Decimal(str(data.get('multiplier', 1)))
        
        # Fetch game and bet
        game = JetXGame.query.filter_by(id=game_id).first()
        bet = JetXBet.query.filter_by(game_id=game_id, user_id=current_user.id).first()
        
        if not game or not bet:
            return jsonify({'error': 'Game or bet not found'}), 404
        
        if bet.status != 'active':
            return jsonify({'error': 'Bet already settled'}), 400
        
        # Validate multiplier is less than crash point
        if multiplier >= game.crash_point:
            return jsonify({'error': 'Crashed - too late to cashout'}), 400
        
        # Calculate winnings
        winnings = bet.bet_amount * multiplier
        
        # Update wallet
        wallet = Wallet.query.filter_by(user_id=current_user.id).first()
        wallet.balance += winnings
        
        # Update bet
        bet.status = 'won'
        bet.cashout_at = float(multiplier)
        bet.payout_amount = winnings
        bet.cashed_out_at = datetime.utcnow()
        
        # Log payout transaction
        tx = Transaction(
            user_id=current_user.id,
            type='payout',
            amount=winnings,
            reference_type='jetx_react_game',
            reference_id=game.id,
            description=f'JetX win at {multiplier}x'
        )
        
        # Update stats
        if not wallet.jetx_stats:
            wallet.jetx_stats = JetXStats(user_id=current_user.id)
        
        profit = winnings - bet.bet_amount
        wallet.jetx_stats.total_winnings = (wallet.jetx_stats.total_winnings or Decimal(0)) + profit
        wallet.jetx_stats.win_count = (wallet.jetx_stats.win_count or 0) + 1
        wallet.jetx_stats.best_multiplier = max(
            wallet.jetx_stats.best_multiplier or Decimal(0),
            multiplier
        )
        wallet.jetx_stats.total_wagered = (wallet.jetx_stats.total_wagered or Decimal(0)) + bet.bet_amount
        
        db.session.add(tx)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'winnings': float(winnings),
            'profit': float(profit),
            'new_balance': float(wallet.balance)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jetx_react_bp.route('/crash', methods=['POST'])
@login_required
def crash_game():
    """Jet crashed - player lost the bet"""
    try:
        data = request.json
        game_id = data.get('game_id')
        
        # Fetch game and bet
        game = JetXGame.query.filter_by(id=game_id).first()
        bet = JetXBet.query.filter_by(game_id=game_id, user_id=current_user.id).first()
        
        if not game or not bet:
            return jsonify({'error': 'Game or bet not found'}), 404
        
        if bet.status != 'active':
            return jsonify({'error': 'Bet already settled'}), 400
        
        # Mark as lost (bet already deducted)
        bet.status = 'lost'
        
        # Update stats
        wallet = Wallet.query.filter_by(user_id=current_user.id).first()
        if not wallet.jetx_stats:
            wallet.jetx_stats = JetXStats(user_id=current_user.id)
        
        wallet.jetx_stats.total_losses = (wallet.jetx_stats.total_losses or Decimal(0)) + bet.bet_amount
        wallet.jetx_stats.loss_count = (wallet.jetx_stats.loss_count or 0) + 1
        wallet.jetx_stats.total_wagered = (wallet.jetx_stats.total_wagered or Decimal(0)) + bet.bet_amount
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'new_balance': float(wallet.balance)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jetx_react_bp.route('/balance', methods=['GET'])
@login_required
def get_balance():
    """Get current user balance"""
    wallet = Wallet.query.filter_by(user_id=current_user.id).first()
    return jsonify({
        'balance': float(wallet.balance) if wallet else 0
    }), 200


@jetx_react_bp.route('/history', methods=['GET'])
@login_required
def get_history():
    """Get user's recent game history"""
    limit = request.args.get('limit', 20, type=int)
    
    bets = JetXBet.query.filter_by(user_id=current_user.id)\
        .order_by(desc(JetXBet.created_at))\
        .limit(limit)\
        .all()
    
    return jsonify([{
        'id': b.id,
        'bet_amount': float(b.bet_amount),
        'cashout_at': float(b.cashout_at) if b.cashout_at else None,
        'payout': float(b.payout_amount) if b.payout_amount else None,
        'status': b.status,
        'created_at': b.created_at.isoformat() if b.created_at else None
    } for b in bets]), 200


@jetx_react_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """Get user's game statistics"""
    try:
        stats = JetXStats.query.filter_by(user_id=current_user.id).first()
        
        if not stats:
            stats = JetXStats(user_id=current_user.id)
            db.session.add(stats)
            db.session.commit()
        
        return jsonify({
            'total_wagered': float(stats.total_wagered or 0),
            'total_won': float(stats.total_winnings or 0),
            'total_lost': float(stats.total_losses or 0),
            'win_count': stats.win_count or 0,
            'loss_count': stats.loss_count or 0,
            'best_multiplier': float(stats.best_multiplier or 0),
            'total_games': (stats.win_count or 0) + (stats.loss_count or 0)
        }), 200

    except Exception as e:
        return jsonify({
            'total_wagered': 0,
            'total_won': 0,
            'total_lost': 0,
            'win_count': 0,
            'loss_count': 0,
            'best_multiplier': 0,
            'total_games': 0
        }), 200

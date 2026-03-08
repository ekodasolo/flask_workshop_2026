from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError
from db.dynamo import get_table

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):
    """レビュー一覧を取得する"""
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        book_response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not book_response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # DynamoDB を query して PK が一致し、SK が 'REVIEW#' で始まるアイテムを取得する
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'BOOK#{book_id}') & Key('SK').begins_with('REVIEW#')
        )
        items = response.get('Items', [])

        reviews = []
        for item in items:
            reviews.append({
                'review_id': item['SK'].replace('REVIEW#', ''),
                'book_id': book_id,
                'reviewer': item['reviewer'],
                'rating': int(item['rating']),
                'comment': item['comment'],
                'created_at': item['created_at'],
            })

        return jsonify({'reviews': reviews})
    except (BotoCoreError, ClientError) as e:
        abort(500)


@reviews_bp.route('/books/<book_id>/reviews', methods=['POST'])
def create_review(book_id):
    """レビューを投稿する"""
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        book_response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not book_response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # リクエストボディを取得する
        data = request.get_json()

        # 必須フィールドのバリデーション
        if not data or not all(key in data for key in ['reviewer', 'rating', 'comment']):
            return jsonify({'error': 'reviewer, rating, comment は必須です'}), 400

        # rating の範囲チェック（1〜5）
        if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({'error': 'rating is out of range (1-5)'}), 400

        # UUID で review_id を生成する
        review_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # DynamoDB にアイテムを書き込む
        item = {
            'PK': f'BOOK#{book_id}',
            'SK': f'REVIEW#{review_id}',
            'reviewer': data['reviewer'],
            'rating': data['rating'],
            'comment': data['comment'],
            'created_at': created_at,
        }
        table.put_item(Item=item)

        # 登録したレビューオブジェクトを返す
        review = {
            'review_id': review_id,
            'book_id': book_id,
            'reviewer': data['reviewer'],
            'rating': data['rating'],
            'comment': data['comment'],
            'created_at': created_at,
        }
        return jsonify(review), 201
    except (BotoCoreError, ClientError) as e:
        abort(500)

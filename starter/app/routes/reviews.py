from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError
from db.dynamo import get_table

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        book_response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not book_response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # ===========================================================
        # TODO: レビュー一覧を取得する
        # ===========================================================
        # 1. table.query() でレビューを取得する
        #    - KeyConditionExpression に Key('PK').eq(...) & Key('SK').begins_with('REVIEW#') を指定する
        # 2. 各アイテムから review_id, book_id, reviewer, rating, comment, created_at を取り出す
        #    - review_id は SK から 'REVIEW#' を除いた部分
        #    - rating は int() で整数に変換する
        # 3. {"reviews": [...]} の形式で jsonify して返す
        pass

    except (BotoCoreError, ClientError) as e:
        print(e)
        abort(500)


@reviews_bp.route('/books/<book_id>/reviews', methods=['POST'])
def create_review(book_id):
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

        # ===========================================================
        # TODO: レビューを DynamoDB に書き込んでレスポンスを返す
        # ===========================================================
        # 1. DynamoDB に書き込むアイテムを辞書で作成する
        #    - PK: 'BOOK#<book_id>'（既存の書籍の PK を使う）
        #    - SK: 'REVIEW#<review_id>'
        #    - reviewer, rating, comment, created_at を含める
        # 2. table.put_item() で DynamoDB に書き込む
        # 3. レビューオブジェクトを jsonify して 201 で返す
        #    - review_id, book_id, reviewer, rating, comment, created_at を含める
        pass

    except (BotoCoreError, ClientError) as e:
        print(e)
        abort(500)

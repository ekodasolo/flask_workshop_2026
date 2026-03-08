from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError
from db.dynamo import get_table

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):
    # ============================================================
    # TODO: レビュー一覧を取得する
    # ============================================================
    # 1. table.get_item() で対象書籍の存在を確認する、なければ 404
    # 2. table.query() でレビューを取得する
    #    - KeyConditionExpression に Key('PK').eq(...) & Key('SK').begins_with('REVIEW#') を指定する
    # 3. 各アイテムから review_id, book_id, reviewer, rating, comment, created_at を取り出す
    #    - review_id は SK から 'REVIEW#' を除いた部分
    # 4. {"reviews": [...]} の形式で jsonify して返す
    pass


@reviews_bp.route('/books/<book_id>/reviews', methods=['POST'])
def create_review(book_id):
    # ============================================================
    # TODO: レビューを投稿する
    # ============================================================
    # 1. table.get_item() で対象書籍の存在を確認する、なければ 404
    # 2. request.get_json() でリクエストボディを取得する
    # 3. reviewer, rating, comment が全て含まれているかチェックする
    #    - 足りなければ 400 エラーを返す
    # 4. rating が 1〜5 の整数かチェックする
    #    - 範囲外なら 400 エラーを返す
    # 5. str(uuid.uuid4()) で review_id を生成する
    # 6. table.put_item() で DynamoDB に書き込む
    #    - PK: 'BOOK#<book_id>', SK: 'REVIEW#<review_id>'
    # 7. 登録したレビューオブジェクトを 201 で返す
    pass

from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime
from db.dynamo import get_table

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):
    # 対象書籍が存在するか確認する、なければ404を返す
    # DynamoDBをqueryしてPK == BOOK#<book_id> かつ SK begins_with 'REVIEW#' のアイテムを取得する
    # レビューリストをJSONで返す
    pass


@reviews_bp.route('/books/<book_id>/reviews', methods=['POST'])
def create_review(book_id):
    # 対象書籍が存在するか確認する、なければ404を返す
    # リクエストボディからreviewer, rating, commentを取得する
    # 必須フィールドが揃っているかバリデーションする
    # UUIDでreview_idを生成する
    # DynamoDBにアイテムを書き込む（PK: BOOK#<book_id>, SK: REVIEW#<review_id>）
    # 登録したレビューオブジェクトを201で返す
    pass

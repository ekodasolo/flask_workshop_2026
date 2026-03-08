from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime, timezone
from botocore.exceptions import BotoCoreError, ClientError
from db.dynamo import get_table

books_bp = Blueprint('books', __name__)


@books_bp.route('/books', methods=['GET'])
def list_books():
    # ============================================================
    # TODO: 書籍一覧を取得する
    # ============================================================
    # 1. get_table() でテーブルオブジェクトを取得する
    # 2. table.scan() で全アイテムを取得する
    # 3. SK が 'METADATA' のアイテムだけを抽出する
    # 4. 各アイテムから book_id, title, author, description, created_at を取り出す
    #    - book_id は PK から 'BOOK#' を除いた部分
    # 5. {"books": [...]} の形式で jsonify して返す
    pass


@books_bp.route('/books', methods=['POST'])
def create_book():
    # ============================================================
    # TODO: 書籍を登録する
    # ============================================================
    # 1. request.get_json() でリクエストボディを取得する
    # 2. title, author, description が全て含まれているかチェックする
    #    - 足りなければ 400 エラーを返す
    # 3. str(uuid.uuid4()) で book_id を生成する
    # 4. 現在時刻を ISO 8601 形式で created_at に設定する
    # 5. table.put_item() で DynamoDB に書き込む
    #    - PK: 'BOOK#<book_id>', SK: 'METADATA'
    # 6. 登録した書籍オブジェクトを 201 で返す
    pass


@books_bp.route('/books/<book_id>', methods=['GET'])
def get_book(book_id):
    # ============================================================
    # TODO: 書籍詳細を取得する
    # ============================================================
    # 1. table.get_item() で PK='BOOK#<book_id>', SK='METADATA' のアイテムを取得する
    # 2. アイテムが存在しなければ 404 エラーを返す
    # 3. 書籍オブジェクトを jsonify して返す
    pass


@books_bp.route('/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    # ============================================================
    # TODO: 書籍を更新する
    # ============================================================
    # 1. table.get_item() で対象書籍の存在を確認する、なければ 404
    # 2. request.get_json() でリクエストボディを取得する
    # 3. title, author, description のうち含まれるフィールドだけを更新対象にする
    # 4. table.update_item() で DynamoDB を更新する
    #    - UpdateExpression, ExpressionAttributeValues, ExpressionAttributeNames を組み立てる
    #    - ReturnValues='ALL_NEW' で更新後のアイテムを受け取る
    # 5. 更新後の書籍オブジェクトを jsonify して返す
    pass


@books_bp.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    # ============================================================
    # TODO: 書籍を削除する
    # ============================================================
    # 1. table.get_item() で対象書籍の存在を確認する、なければ 404
    # 2. table.delete_item() で DynamoDB からアイテムを削除する
    # 3. {"message": "Book deleted"} を jsonify して返す
    pass

from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime
from db.dynamo import get_table

books_bp = Blueprint('books', __name__)


@books_bp.route('/books', methods=['GET'])
def list_books():
    # DynamoDBをscanして全書籍レコード（SK == 'METADATA'）を取得する
    # 書籍リストをJSONで返す
    pass


@books_bp.route('/books', methods=['POST'])
def create_book():
    # リクエストボディからtitle, author, descriptionを取得する
    # 必須フィールドが揃っているかバリデーションする
    # UUIDでbook_idを生成する
    # DynamoDBにアイテムを書き込む（PK: BOOK#<book_id>, SK: METADATA）
    # 登録した書籍オブジェクトを201で返す
    pass


@books_bp.route('/books/<book_id>', methods=['GET'])
def get_book(book_id):
    # DynamoDBからbook_idに対応するアイテムを取得する
    # 存在しない場合は404を返す
    # 書籍オブジェクトをJSONで返す
    pass


@books_bp.route('/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    # 対象書籍が存在するか確認する、なければ404を返す
    # リクエストボディから変更フィールドを取得する
    # DynamoDBのupdate_itemで該当フィールドを更新する
    # 更新後の書籍オブジェクトをJSONで返す
    pass


@books_bp.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    # 対象書籍が存在するか確認する、なければ404を返す
    # DynamoDBからアイテムを削除する
    # 削除完了メッセージをJSONで返す
    pass

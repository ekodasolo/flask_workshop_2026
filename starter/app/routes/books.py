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
    try:
        table = get_table()

        # ===========================================================
        # TODO: 書籍詳細を取得する
        # ===========================================================
        # 1. table.get_item() で PK='BOOK#<book_id>', SK='METADATA' のアイテムを取得する
        # 2. アイテムが存在しなければ 404 エラーを返す
        #    - return jsonify({'error': 'Book not found'}), 404
        # 3. 書籍オブジェクトを jsonify して返す
        #    - book_id, title, author, description, created_at を含める
        pass

    except (BotoCoreError, ClientError) as e:
        print(e)
        abort(500)


@books_bp.route('/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # リクエストボディから変更フィールドを取得する
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # 更新可能なフィールドだけを対象にする
        allowed_fields = ['title', 'author', 'description']

        # ===========================================================
        # TODO: UpdateExpression を組み立てて update_item を実行する
        # ===========================================================
        # 1. allowed_fields のうち data に含まれるフィールドについて、以下の 3 つを組み立てる:
        #    - update_expressions: ['#title = :title', '#author = :author', ...]
        #    - expression_values:  {':title': '新しいタイトル', ...}
        #    - expression_names:   {'#title': 'title', ...}
        # 2. 更新対象がなければ 400 エラーを返す
        # 3. table.update_item() を実行する
        #    - UpdateExpression='SET ' + ', '.join(update_expressions)
        #    - ReturnValues='ALL_NEW' で更新後のアイテムを受け取る
        # 4. 更新後の書籍オブジェクトを jsonify して返す
        #    - book_id, title, author, description, created_at を含める
        pass

    except (BotoCoreError, ClientError) as e:
        print(e)
        abort(500)


@books_bp.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # ===========================================================
        # TODO: 書籍を削除する
        # ===========================================================
        # 1. table.delete_item() で DynamoDB からアイテムを削除する
        #    - Key に PK と SK を指定する
        # 2. {"message": "Book deleted"} を jsonify して返す
        pass

    except (BotoCoreError, ClientError) as e:
        print(e)
        abort(500)

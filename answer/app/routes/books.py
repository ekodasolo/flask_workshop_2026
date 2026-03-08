from flask import Blueprint, request, jsonify, abort
import uuid
from datetime import datetime, timezone
from botocore.exceptions import BotoCoreError, ClientError
from db.dynamo import get_table

books_bp = Blueprint('books', __name__)


@books_bp.route('/books', methods=['GET'])
def list_books():
    """書籍一覧を取得する"""
    try:
        table = get_table()
        # DynamoDB を scan して全アイテムを取得する
        response = table.scan()
        items = response.get('Items', [])

        # SK が 'METADATA' のアイテム（= 書籍レコード）だけを抽出する
        books = []
        for item in items:
            if item.get('SK') == 'METADATA':
                books.append({
                    'book_id': item['PK'].replace('BOOK#', ''),
                    'title': item['title'],
                    'author': item['author'],
                    'description': item['description'],
                    'created_at': item['created_at'],
                })

        return jsonify({'books': books})
    except (BotoCoreError, ClientError) as e:
        abort(500)


@books_bp.route('/books', methods=['POST'])
def create_book():
    """書籍を登録する"""
    # リクエストボディを取得する
    data = request.get_json()

    # 必須フィールドのバリデーション
    if not data or not all(key in data for key in ['title', 'author', 'description']):
        return jsonify({'error': 'title, author, description は必須です'}), 400

    try:
        table = get_table()

        # UUID で book_id を生成する
        book_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # DynamoDB にアイテムを書き込む
        item = {
            'PK': f'BOOK#{book_id}',
            'SK': 'METADATA',
            'title': data['title'],
            'author': data['author'],
            'description': data['description'],
            'created_at': created_at,
        }
        table.put_item(Item=item)

        # 登録した書籍オブジェクトを返す
        book = {
            'book_id': book_id,
            'title': data['title'],
            'author': data['author'],
            'description': data['description'],
            'created_at': created_at,
        }
        return jsonify(book), 201
    except (BotoCoreError, ClientError) as e:
        abort(500)


@books_bp.route('/books/<book_id>', methods=['GET'])
def get_book(book_id):
    """書籍詳細を取得する"""
    try:
        table = get_table()

        # DynamoDB から book_id に対応するアイテムを取得する
        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        item = response.get('Item')

        # 存在しない場合は 404 を返す
        if not item:
            return jsonify({'error': 'Book not found'}), 404

        book = {
            'book_id': book_id,
            'title': item['title'],
            'author': item['author'],
            'description': item['description'],
            'created_at': item['created_at'],
        }
        return jsonify(book)
    except (BotoCoreError, ClientError) as e:
        abort(500)


@books_bp.route('/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    """書籍を更新する"""
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
        update_expressions = []
        expression_values = {}
        expression_names = {}

        for field in allowed_fields:
            if field in data:
                update_expressions.append(f'#{field} = :{field}')
                expression_values[f':{field}'] = data[field]
                expression_names[f'#{field}'] = field

        if not update_expressions:
            return jsonify({'error': 'No valid fields to update'}), 400

        # DynamoDB の update_item で該当フィールドを更新する
        result = table.update_item(
            Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names,
            ReturnValues='ALL_NEW',
        )

        updated = result['Attributes']
        book = {
            'book_id': book_id,
            'title': updated['title'],
            'author': updated['author'],
            'description': updated['description'],
            'created_at': updated['created_at'],
        }
        return jsonify(book)
    except (BotoCoreError, ClientError) as e:
        abort(500)


@books_bp.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    """書籍を削除する"""
    try:
        table = get_table()

        # 対象書籍が存在するか確認する
        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        # DynamoDB からアイテムを削除する
        table.delete_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})

        return jsonify({'message': 'Book deleted'})
    except (BotoCoreError, ClientError) as e:
        abort(500)

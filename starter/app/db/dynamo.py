import boto3
import os

# 環境変数 TABLE_NAME からテーブル名を取得する
TABLE_NAME = os.environ.get('TABLE_NAME', 'book-review-api')

# boto3 の DynamoDB リソースを初期化する
dynamodb = boto3.resource('dynamodb')


def get_table():
    """テーブルオブジェクトを返す"""
    return dynamodb.Table(TABLE_NAME)

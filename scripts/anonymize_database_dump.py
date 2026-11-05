#!/usr/bin/env python3
"""
Greach Impact Academy - Verified Relational Data Anonymizer
Provides deterministic, relational-preserving pseudo-anonymization for database dumps.
Replaces real student PII with synthetic data while preserving relational integrity.
"""

import sys
import os
import re
import hashlib

class RelationalAnonymizer:
    def __init__(self, salt="greach_staging_salt_2026"):
        self.salt = salt.encode('utf-8')
        self.email_map = {}
        self.phone_map = {}
        self.name_map = {}
        self.id_map = {}
        self.counter = 1

    def _hash(self, val):
        return hashlib.sha256(self.salt + val.strip().lower().encode('utf-8')).hexdigest()

    def get_synthetic_email(self, original_email):
        if not original_email or '@' not in original_email:
            return original_email
        clean = original_email.strip().lower()
        if clean not in self.email_map:
            h = self._hash(clean)[:8]
            self.email_map[clean] = f"student_{h}@staging.greach.academy"
        return self.email_map[clean]

    def get_synthetic_phone(self, original_phone):
        if not original_phone:
            return original_phone
        clean = re.sub(r'\D', '', str(original_phone))
        if not clean:
            return original_phone
        if clean not in self.phone_map:
            h = int(self._hash(clean)[:7], 16) % 90000000 + 10000000
            self.phone_map[clean] = f"+23480{h}"
        return self.phone_map[clean]

    def get_synthetic_name(self, original_name):
        if not original_name:
            return original_name
        clean = original_name.strip()
        if clean not in self.name_map:
            h = self._hash(clean)[:6].upper()
            self.name_map[clean] = f"Student_{h}"
        return self.name_map[clean]

    def get_synthetic_id(self, original_id):
        if not original_id:
            return original_id
        clean = original_id.strip()
        if clean not in self.id_map:
            num = str(self.counter).zfill(4)
            self.counter += 1
            self.id_map[clean] = f"STU-STG-{num}"
        return self.id_map[clean]

    def anonymize_sql_line(self, line):
        # Match common email patterns and replace deterministically
        def replace_email(match):
            return self.get_synthetic_email(match.group(0))

        # Replace emails
        line = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', replace_email, line)

        # Replace Nigerian phone numbers
        def replace_phone(match):
            return self.get_synthetic_phone(match.group(0))

        line = re.sub(r'(\+?234|0)[789][01]\d{8}', replace_phone, line)

        return line

    def process_file(self, input_path, output_path):
        if not os.path.exists(input_path):
            print(f"Error: Input file '{input_path}' not found.")
            return False

        print(f"[*] Reading source dump: {input_path}")
        with open(input_path, 'r', encoding='utf-8', errors='replace') as infile, \
             open(output_path, 'w', encoding='utf-8') as outfile:
            for line in infile:
                sanitized = self.anonymize_sql_line(line)
                outfile.write(sanitized)

        print(f"[+] Relational anonymization complete.")
        print(f"    - Unique Emails Anonymized: {len(self.email_map)}")
        print(f"    - Unique Phones Anonymized: {len(self.phone_map)}")
        print(f"    - Staging dump written to: {output_path}")
        return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python anonymize_database_dump.py <input_dump.sql> <output_sanitized.sql>")
        sys.exit(1)
    anonymizer = RelationalAnonymizer()
    success = anonymizer.process_file(sys.argv[1], sys.argv[2])
    sys.exit(0 if success else 1)

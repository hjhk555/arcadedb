/*
 * Copyright © 2021-present Arcade Data Ltd (info@arcadedata.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.arcadedb.index;

import com.arcadedb.TestHelper;
import com.arcadedb.database.Document;
import com.arcadedb.database.MutableDocument;
import com.arcadedb.query.sql.executor.ResultSet;
import com.arcadedb.schema.DocumentType;
import com.arcadedb.schema.Schema;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.*;

public class LSMTreeIndexPolymorphicTest extends TestHelper {

  @Test
  public void testPolymorphic() {
    testPolymorphic(Schema.INDEX_TYPE.LSM_TREE);
  }

  @Test
  public void testPolymorphicFullText() {
    testPolymorphic(Schema.INDEX_TYPE.FULL_TEXT);
  }

  private void testPolymorphic(Schema.INDEX_TYPE indexType) {
    DocumentType typeRoot = database.getSchema().getOrCreateDocumentType("TestRoot");
    typeRoot.getOrCreateProperty("name", String.class);
    typeRoot.getOrCreateTypeIndex(indexType, true, "name");
    database.command("sql", "delete from TestRoot");

    DocumentType typeChild = database.getSchema().getOrCreateDocumentType("TestChild");
    typeChild.setSuperTypes(Arrays.asList(typeRoot));

    MutableDocument docRoot = database.newDocument("TestRoot");
    database.transaction(() -> {
      docRoot.set("name", "Root");
      Assertions.assertEquals("Root", docRoot.get("name"));
      docRoot.save();
    });
    Assertions.assertEquals("Root", docRoot.get("name"));

    MutableDocument docChild = database.newDocument("TestChild");
    database.transaction(() -> {
      docChild.set("name", "Child");
      Assertions.assertEquals("Child", docChild.get("name"));
      docChild.save();
    });
    Assertions.assertEquals("Child", docChild.get("name"));

    try (ResultSet rs = database.query("sql", "select from TestRoot where name <> :name", Map.of("arg0", "Test2", "name", "Nonsense"))) {
      Assertions.assertTrue(rs.hasNext());
      Document doc1Retrieved = rs.next().getElement().orElse(null);
      Assertions.assertTrue(rs.hasNext());
      Document doc2Retrieved = rs.next().getElement().orElse(null);

      if (doc1Retrieved.getTypeName().equals("TestRoot"))
        Assertions.assertEquals("Root", doc1Retrieved.get("name"));
      else if (doc2Retrieved.getTypeName().equals("TestChild"))
        Assertions.assertEquals("Child", doc2Retrieved.get("name"));
      else
        Assertions.fail();

      Assertions.assertFalse(rs.hasNext());
    }

    try (ResultSet rs = database.query("sql", "select from TestChild where name = :name", Map.of("arg0", "Test2", "name", "Child"))) {
      Assertions.assertTrue(rs.hasNext());
      Document doc1Retrieved = rs.next().getElement().orElse(null);
      Assertions.assertEquals("Child", doc1Retrieved.get("name"));
      Assertions.assertFalse(rs.hasNext());
    }

    typeChild.removeSuperType(typeRoot);

    try (ResultSet rs = database.query("sql", "select from TestChild where name = :name", Map.of("arg0", "Test2", "name", "Child"))) {
      Assertions.assertTrue(rs.hasNext());
      Document doc1Retrieved = rs.next().getElement().orElse(null);
      Assertions.assertEquals("Child", doc1Retrieved.get("name"));
      Assertions.assertFalse(rs.hasNext());
    }

    try (ResultSet rs = database.query("sql", "select from TestRoot where name <> :name", Map.of("arg0", "Test2", "name", "Nonsense"))) {
      Assertions.assertTrue(rs.hasNext());
      Document doc1Retrieved = rs.next().getElement().orElse(null);
      Assertions.assertEquals("Root", doc1Retrieved.get("name"));
      Assertions.assertFalse(rs.hasNext());
    }
  }

}

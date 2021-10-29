package org.apache.tinkerpop.gremlin.arcadedb;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import org.apache.commons.collections.IteratorUtils;
import org.apache.tinkerpop.gremlin.arcadedb.structure.ArcadeGraph;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.arcadedb.database.Database;
import com.arcadedb.graph.MutableVertex;
import com.arcadedb.query.sql.executor.Result;
import com.arcadedb.query.sql.executor.ResultSet;
import com.arcadedb.schema.Schema;
import com.arcadedb.utility.FileUtils;
import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class CypherQueryEngineTest {

  private static final String DB_PATH = "./target/testsql";

  @Test
  public void verifyProjectionWithCollectFunction() throws ExecutionException, InterruptedException {
    final ArcadeGraph graph = ArcadeGraph.open(DB_PATH);
    try (Database database = graph.getDatabase()) {
      database.transaction(() -> {
        Schema schema = database.getSchema();
        schema.getOrCreateVertexType("V");
        schema.getOrCreateEdgeType("E");

        MutableVertex v1 = database.newVertex("V").save();
        MutableVertex v2 = database.newVertex("V").save();
        MutableVertex v3 = database.newVertex("V").save();

        v1.newEdge("E", v2, true);
        v1.newEdge("E", v3, true);
        try (ResultSet query = database.query("cypher",
          "match(parent:V)-[e:E]-(child:V) where id(parent) = $p return parent as parent, collect(child) as childs", "p",
          v1.getIdentity())) {

          // Ensure that the result (set) has the desired format
          List<Result> results = IteratorUtils.toList(query, 1);
          assertThat(results, hasSize(1));

          Result result = results.get(0);
          assertThat(result, notNullValue());
          assertThat(result.isProjection(), equalTo(true));
          assertThat(result.getPropertyNames(), hasItems("parent", "childs"));

          // Transform rid from result to string as in vertex
          Result parentAsResult = result.getProperty("parent");
          Map<String, Object> parent = parentAsResult.toMap();
          parent.computeIfPresent("@rid", (k, v) -> Objects.toString(v));
          Map<String, Object> vertexMap = v1.toJSON().toMap();
          assertThat(parent, equalTo(vertexMap));

          // Transform rid from result to string as in vertex
          List<Result> childsAsResult = result.getProperty("childs");
          List<Map<String, Object>> childs = childsAsResult.stream()
            .map(Result::toMap)
            .collect(Collectors.toList());
          childs.forEach(c -> c.computeIfPresent("@rid", (k, v) -> Objects.toString(v)));
          List<Map<String, Object>> childVertices = Stream.of(v2, v3)
            .map(MutableVertex::toJSON)
            .map(JSONObject::toMap).collect(Collectors.toList());
          assertThat(childs, containsInAnyOrder(childVertices.toArray()));
        }

      });
    } finally {
      graph.drop();
    }
  }

  @BeforeEach
  @AfterEach
  public void clean() {
    FileUtils.deleteRecursively(new File(DB_PATH));
  }
}
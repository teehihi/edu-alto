package com.edualto.common.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import tools.jackson.databind.DefaultTyping;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import tools.jackson.databind.jsontype.PolymorphicTypeValidator;
import tools.jackson.databind.jsontype.TypeResolverBuilder;
import tools.jackson.databind.jsontype.impl.DefaultTypeResolverBuilder;

@Configuration
@EnableCaching
public class RedisCacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheConfig.class);

    public static final String CACHE_COURSES_CATALOG = "courses:catalog";
    public static final String CACHE_COURSES_DETAIL = "courses:detail";
    public static final String CACHE_COURSES_CURRICULUM = "courses:curriculum";
    public static final String CACHE_AUTH_SESSIONS = "auth:sessions";
    public static final String CACHE_AUTH_REFRESH_TOKENS = "auth:refresh-tokens";
    public static final String CACHE_ROLE_PERMISSIONS = "rbac:role_permissions";

    RedisSerializer<Object> createRedisSerializer() {
        PolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("com.edualto.")
                .allowIfSubType("java.util.")
                .allowIfSubType("java.time.")
                .allowIfSubType("java.math.")
                .allowIfSubType("org.springframework.cache.support.NullValue")
                .allowIfSubTypeIsArray()
                .build();
        TypeResolverBuilder<?> typeResolverBuilder = new DefaultTypeResolverBuilder(
                typeValidator,
                DefaultTyping.NON_FINAL_AND_RECORDS,
                JsonTypeInfo.As.PROPERTY
        ) {
            @Override
            public DefaultTypeResolverBuilder withDefaultImpl(Class<?> defaultImpl) {
                return this;
            }

            @Override
            public boolean useForType(JavaType type) {
                return super.useForType(type)
                        || Collection.class.isAssignableFrom(type.getRawClass())
                        || Map.class.isAssignableFrom(type.getRawClass());
            }
        };
        JsonMapper mapper = JsonMapper.builder()
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .disable(DeserializationFeature.FAIL_ON_MISSING_EXTERNAL_TYPE_ID_PROPERTY)
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .setDefaultTyping(typeResolverBuilder)
                .build();
        return new GenericJacksonJsonRedisSerializer(mapper) {
            @Override
            protected JavaType resolveType(byte[] source, Class<?> type) {
                // Keep Object.class at the root so Jackson's PolymorphicTypeValidator always validates @class.
                return mapper.constructType(type);
            }
        };
    }

    @Bean
    public RedisCacheConfiguration defaultCacheConfiguration() {
        RedisSerializer<Object> serializer = createRedisSerializer();
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .prefixCacheNameWith("edualto:")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration baseConfig = defaultCacheConfiguration();

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        cacheConfigs.put(CACHE_COURSES_CATALOG, baseConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigs.put(CACHE_COURSES_DETAIL, baseConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put(CACHE_COURSES_CURRICULUM, baseConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put(CACHE_AUTH_SESSIONS, baseConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigs.put(CACHE_AUTH_REFRESH_TOKENS, baseConfig.entryTtl(Duration.ofDays(14)));
        cacheConfigs.put(CACHE_ROLE_PERMISSIONS, baseConfig.entryTtl(Duration.ofHours(2)));

        log.info("Khởi tạo RedisCacheManager thành công với các namespace cache: courses:catalog (15m), courses:detail (30m), courses:curriculum (30m), auth:sessions (15m)");

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(baseConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        RedisSerializer<Object> serializer = createRedisSerializer();
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);
        template.afterPropertiesSet();
        return template;
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new ResilientCacheErrorHandler();
    }

    public static class ResilientCacheErrorHandler implements CacheErrorHandler {
        private static final Logger errorHandlerLog = LoggerFactory.getLogger(ResilientCacheErrorHandler.class);

        @Override
        public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
            errorHandlerLog.warn("Redis GET không thành công trên cache [{}], key [{}]: {}. Tiếp tục truy vấn từ DB.",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
            errorHandlerLog.warn("Redis PUT không thành công trên cache [{}], key [{}]: {}",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
            errorHandlerLog.warn("Redis EVICT không thành công trên cache [{}], key [{}]: {}",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCacheClearError(RuntimeException exception, Cache cache) {
            errorHandlerLog.warn("Redis CLEAR không thành công trên cache [{}]: {}",
                    cache.getName(), exception.getMessage());
        }
    }
}
